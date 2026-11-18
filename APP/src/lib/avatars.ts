import type { Gender } from '../types/chat';

export const GENDER_AVATARS: Record<Gender, string> = {
  Man: 'bloom-avatar://man/0',
  Woman: 'bloom-avatar://woman/0',
  Other: 'bloom-avatar://other/0',
};

export function avatarFor(gender: Gender, avatar?: string | null) {
  const value = avatar?.trim();
  if (!value) return GENDER_AVATARS[gender];
  if (value.startsWith('bloom-avatar://')) return value;
  // Existing accounts have stable URLs, so hash them to one of the new
  // illustrated portraits without displaying the old generated face or photo.
  let hash = 2166136261;
  for (const character of value) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return `bloom-avatar://${gender.toLowerCase()}/${(hash >>> 0) % (gender === 'Other' ? 1 : 2)}`;
}
