let adminKey = '';
const $ = (id) => document.getElementById(id);
const notice = (message) => { $('notice').textContent = message; };
async function request(path, method = 'GET', body) {
  const response = await fetch(`/admin/api/ads${path}`, {
    method, cache: 'no-store', headers: { 'x-admin-key': adminKey, ...(body ? { 'content-type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
  return payload;
}
function cell(row, value) { const td = document.createElement('td'); td.textContent = String(value ?? ''); row.append(td); return td; }
function renderRows(id, rows, fields) {
  const target = $(id); target.replaceChildren();
  for (const item of rows) { const row = document.createElement('tr'); for (const field of fields) cell(row, field(item)); target.append(row); }
}
function render(data) {
  const { config, stats } = data;
  $('enabled').checked = Boolean(config.enabled);
  $('maleInterval').value = config.male_interval;
  $('femaleInterval').value = config.female_interval;
  $('otherInterval').value = config.other_interval;
  $('androidUnitId').value = config.android_unit_id;
  $('iosUnitId').value = config.ios_unit_id;
  $('stats').replaceChildren();
  for (const [label, value] of Object.entries({ Requests: stats.requests, Impressions: stats.impressions, Failures: stats.failures, 'Blocked checks': stats.blockedChecks, 'Premium users': stats.premiumUsers })) {
    const card = document.createElement('div'); card.className = 'stat';
    const number = document.createElement('strong'); number.textContent = value;
    const caption = document.createElement('span'); caption.textContent = label;
    card.append(number, caption); $('stats').append(card);
  }
  renderRows('attempts', data.attempts, [x => x.created_at, x => x.status, x => x.error_code, x => x.user_id]);
  renderRows('detections', data.detections, [x => x.created_at, x => x.outcome, x => x.checkpoint, x => x.evidence]);
  renderRows('subscriptions', data.subscriptions, [x => x.created_at, x => x.provider, x => x.plan, x => x.status, x => x.expires_at]);
  const catalog = $('catalog'); catalog.replaceChildren();
  for (const entry of data.catalog) {
    const row = document.createElement('tr'); cell(row, entry.name); cell(row, entry.category);
    const td = document.createElement('td'); const checkbox = document.createElement('input'); checkbox.type = 'checkbox'; checkbox.checked = Boolean(entry.enabled);
    checkbox.addEventListener('change', async () => { try { await request(`/catalog/${encodeURIComponent(entry.id)}`, 'PATCH', { enabled: checkbox.checked }); notice('Catalog updated.'); } catch (error) { checkbox.checked = !checkbox.checked; notice(error.message); } });
    td.append(checkbox); row.append(td); catalog.append(row);
  }
  const plans = $('plans'); plans.replaceChildren();
  for (const plan of data.plans) {
    const form = document.createElement('form'); form.className = 'plan';
    const fields = [ ['label', plan.label], ['productId', plan.product_id], ['priceLabel', plan.price_label] ];
    for (const [name, value] of fields) { const label = document.createElement('label'); label.textContent = name === 'productId' ? 'Store product ID' : name === 'priceLabel' ? 'Price label' : 'Name'; const input = document.createElement('input'); input.name = name; input.value = value; label.append(input); form.append(label); }
    const enabledLabel = document.createElement('label'); enabledLabel.className = 'checkbox'; enabledLabel.textContent = 'Enabled'; const enabled = document.createElement('input'); enabled.name = 'enabled'; enabled.type = 'checkbox'; enabled.checked = Boolean(plan.enabled); enabledLabel.prepend(enabled); form.append(enabledLabel);
    const save = document.createElement('button'); save.type = 'submit'; save.textContent = `Save ${plan.id}`; form.append(save);
    form.addEventListener('submit', async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(form)); try { await request(`/plans/${plan.id}`, 'PUT', { label: values.label, productId: values.productId, priceLabel: values.priceLabel, enabled: enabled.checked }); notice(`${plan.id} plan saved.`); } catch (error) { notice(error.message); } });
    plans.append(form);
  }
}
async function refresh() { const data = await request('/summary'); render(data); $('dashboard').hidden = false; $('loginPanel').hidden = true; notice('Dashboard updated.'); }
$('loginForm').addEventListener('submit', async (event) => { event.preventDefault(); adminKey = $('adminKey').value; try { await refresh(); $('adminKey').value = ''; } catch (error) { adminKey = ''; notice(error.message); } });
$('refresh').addEventListener('click', () => { void refresh().catch((error) => notice(error.message)); });
$('configForm').addEventListener('submit', async (event) => { event.preventDefault(); try { await request('/config', 'PATCH', { enabled: $('enabled').checked, maleInterval: Number($('maleInterval').value), femaleInterval: Number($('femaleInterval').value), otherInterval: Number($('otherInterval').value), androidUnitId: $('androidUnitId').value.trim(), iosUnitId: $('iosUnitId').value.trim() }); await refresh(); notice('Ad settings saved.'); } catch (error) { notice(error.message); } });
$('catalogForm').addEventListener('submit', async (event) => { event.preventDefault(); try { await request('/catalog', 'POST', { name: $('catalogName').value.trim(), category: $('catalogCategory').value }); $('catalogName').value = ''; await refresh(); notice('Service added.'); } catch (error) { notice(error.message); } });
