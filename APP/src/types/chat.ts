export type Gender = 'Woman' | 'Man' | 'Other';
export type ChatMode = 'Text' | 'Voice' | 'Video';

export interface Partner {
  id: string; name: string; avatar: string; country: string; city: string; flag: string; age: number;
  gender: Gender; language: string; level: number; verified: boolean; about: string; interests: string[];
}
