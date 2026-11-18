let key = '';
const $ = (id) => document.getElementById(id);
function element(tag, text) { const node = document.createElement(tag); if (text !== undefined) node.textContent = String(text); return node; }
function note(message) { $('notice').textContent = message; }
async function api(path, method = 'GET', body) {
  const response = await fetch(`/admin/api/creators${path}`, { method, cache: 'no-store', headers: { 'x-admin-key': key, ...(body ? { 'content-type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const payload = await response.json(); if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`); return payload;
}
function field(label, value, type = 'text') { const wrap = element('label', label); const input = element('input'); input.type = type; input.value = value ?? ''; wrap.append(input); return { wrap, input }; }
function button(label, action) { const node = element('button', label); node.type = 'button'; node.addEventListener('click', () => { void action().catch((error) => note(error.message)); }); return node; }
function row(target, values) { const tr = element('tr'); for (const value of values) tr.append(element('td', value)); target.append(tr); }
async function showPhoto(id, step) {
  const response = await fetch(`/admin/api/creators/applications/${encodeURIComponent(id)}/photo/${step}`, { headers: { 'x-admin-key': key }, cache: 'no-store' });
  if (!response.ok) throw new Error('Photo is unavailable');
  const url = URL.createObjectURL(await response.blob()); const win = window.open(url, '_blank', 'noopener');
  if (!win) note('Allow a new tab to view the protected photo.');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
function render(data) {
  $('dashboard').hidden = false; $('loginPanel').hidden = true;
  const config = data.config;
  $('coinName').value = config.coin_name; $('rupeesPerCoin').value = config.rupees_per_coin; $('minTopup').value = config.min_topup_rupees; $('minWithdrawal').value = config.min_withdrawal_coins; $('creatorShare').value = config.creator_share_percent;
  $('stats').replaceChildren();
  for (const [name, value] of Object.entries({ Purchased: data.stats.purchased, Transferred: data.stats.transferred, 'Creator earnings': data.stats.earned, 'Pending withdrawals': data.stats.pendingWithdrawals, 'Paid commission (₹)': (data.stats.paidCommissionPaise / 100).toFixed(2) })) { const card = element('div'); card.className = 'stat'; card.append(element('strong', value), element('span', name)); $('stats').append(card); }
  $('packages').replaceChildren();
  for (const pack of data.packages) { const form = element('form'); form.className = 'plan'; const android = field('Android product ID', pack.android_product_id); const ios = field('iOS product ID', pack.ios_product_id); const enabled = field('Enabled', '', 'checkbox'); enabled.input.checked = Boolean(pack.enabled); form.append(element('h3', `${pack.coins} Coins`), android.wrap, ios.wrap, enabled.wrap); const save = element('button', 'Save'); form.append(save); form.addEventListener('submit', (event) => { event.preventDefault(); void api(`/packages/${pack.coins}`, 'PATCH', { androidProductId: android.input.value.trim(), iosProductId: ios.input.value.trim(), enabled: enabled.input.checked }).then(() => note('Package saved')).catch((error) => note(error.message)); }); $('packages').append(form); }
  $('applications').replaceChildren();
  for (const app of data.applications) { const card = element('div'); card.className = 'plan'; card.append(element('h3', `${app.name} (${app.bloom_id}) — ${app.status}`), element('p', `Gender: ${app.gender} | Submitted: ${app.submitted_at || 'Not submitted'}`), element('p', `Selfie: ${app.selfie_result || 'Pending'}`), element('p', `Code photo: ${app.otp_result || 'Pending'}`));
    card.append(button('View live selfie', () => showPhoto(app.id, 'selfie')), button('View code photo', () => showPhoto(app.id, 'otp')), button('View code', async () => { const result = await api(`/applications/${encodeURIComponent(app.id)}/code`); note(`Verification code for ${app.bloom_id}: ${result.code}`); }));
    if (app.status === 'under_review') { const reason = field('Review note', ''); card.append(reason.wrap, button('Approve Creator', async () => { if (!confirm('Have you manually reviewed both photos and the verification results?')) return; await api(`/applications/${app.id}`, 'PATCH', { decision: 'approved', note: reason.input.value }); await refresh(); }), button('Reject application', async () => { await api(`/applications/${app.id}`, 'PATCH', { decision: 'rejected', note: reason.input.value }); await refresh(); })); }
    $('applications').append(card); }
  $('withdrawals').replaceChildren();
  for (const wd of data.withdrawals) { const card = element('div'); card.className = 'plan'; card.append(element('h3', `${wd.name} — ${wd.coins} Coins — ${wd.status}`), element('p', `Creator receives ₹${(wd.payout_paise / 100).toFixed(2)}; platform ₹${(wd.commission_paise / 100).toFixed(2)}. Requested ${wd.created_at}`));
    const memo = field('Note / payout reference', wd.note || ''); card.append(memo.wrap);
    if (wd.status === 'pending') card.append(button('Approve', async () => { await api(`/withdrawals/${wd.id}`, 'PATCH', { decision: 'approved', note: memo.input.value }); await refresh(); }), button('Reject and refund Coins', async () => { await api(`/withdrawals/${wd.id}`, 'PATCH', { decision: 'rejected', note: memo.input.value }); await refresh(); }));
    if (wd.status === 'approved') card.append(button('Mark paid', async () => { if (!memo.input.value.trim()) throw new Error('Enter the actual payout reference'); await api(`/withdrawals/${wd.id}`, 'PATCH', { decision: 'paid', payoutReference: memo.input.value.trim(), note: memo.input.value.trim() }); await refresh(); })); $('withdrawals').append(card); }
  $('wallets').replaceChildren(); for (const w of data.wallets) row($('wallets'), [w.name, w.bloom_id, w.purchased_coins, w.earned_coins]);
  $('transactions').replaceChildren(); for (const t of data.transactions) row($('transactions'), [t.created_at, t.user_id, t.type, t.purchased_delta, t.earned_delta, t.reference_id]);
}
async function refresh() { render(await api('/summary')); note('Dashboard updated.'); }
$('loginForm').addEventListener('submit', (event) => { event.preventDefault(); key = $('adminKey').value; void refresh().then(() => { $('adminKey').value = ''; }).catch((error) => { key = ''; note(error.message); }); });
$('configForm').addEventListener('submit', (event) => { event.preventDefault(); void api('/config', 'PATCH', { coinName: $('coinName').value.trim(), rupeesPerCoin: Number($('rupeesPerCoin').value), minTopupRupees: Number($('minTopup').value), minWithdrawalCoins: Number($('minWithdrawal').value), creatorSharePercent: Number($('creatorShare').value) }).then(refresh).catch((error) => note(error.message)); });
