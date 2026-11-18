export type Gender = 'Man' | 'Woman' | 'Other';

export interface UserRow {
  id: string; token_hash: string | null; bloom_id: string; name: string; avatar: string;
  country: string; city: string; flag: string; age: number; gender: Gender; language: string;
  level: number; verified: number; about: string; interests: string; points: number;
  premium_until: string | null; is_demo: number; theme: 'light' | 'dark'; font_scale: number; created_at: string; updated_at: string;
}

export function isPremium(user: UserRow) {
  return Boolean(user.premium_until && new Date(user.premium_until).getTime() > Date.now());
}

export function publicUser(user: UserRow) {
  return {
    id: user.id,
    bloomId: user.bloom_id,
    name: user.name,
    avatar: user.avatar,
    country: user.country,
    city: user.city,
    flag: user.flag,
    age: user.age,
    gender: user.gender,
    language: user.language,
    level: user.level,
    verified: Boolean(user.verified),
    about: user.about,
    interests: JSON.parse(user.interests) as string[],
    isDemo: Boolean(user.is_demo),
  };
}

export function privateUser(user: UserRow) {
  return { ...publicUser(user), points: user.points, premium: isPremium(user), premiumUntil: user.premium_until, theme: user.theme, fontScale: user.font_scale };
}
