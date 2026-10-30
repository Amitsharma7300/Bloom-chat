import { Partner } from '../types/chat';

export const PARTNERS: Partner[] = [
  { id: 'maya', name: 'Maya', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=700&q=85', country: 'Spain', city: 'Barcelona', flag: '🇪🇸', age: 24, gender: 'Woman', language: 'English', level: 18, verified: true, about: 'Coffee hunter, weekend traveler, and always up for a warm conversation.', interests: ['Travel', 'Music', 'Coffee'] },
  { id: 'noah', name: 'Noah', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=85', country: 'Canada', city: 'Toronto', flag: '🇨🇦', age: 27, gender: 'Man', language: 'English', level: 12, verified: true, about: 'Designer, amateur cook, and professional playlist maker.', interests: ['Design', 'Food', 'Movies'] },
  { id: 'aisha', name: 'Aisha', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=85', country: 'United Kingdom', city: 'London', flag: '🇬🇧', age: 23, gender: 'Woman', language: 'English', level: 21, verified: true, about: 'Book lover who never says no to live music or a spontaneous trip.', interests: ['Books', 'Concerts', 'Travel'] },
  { id: 'arjun', name: 'Arjun', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=700&q=85', country: 'India', city: 'Bengaluru', flag: '🇮🇳', age: 26, gender: 'Man', language: 'Hindi', level: 16, verified: false, about: 'Building apps by day, watching cricket and anime by night.', interests: ['Tech', 'Cricket', 'Anime'] },
  { id: 'sofia', name: 'Sofia', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=700&q=85', country: 'Brazil', city: 'Rio', flag: '🇧🇷', age: 25, gender: 'Woman', language: 'Portuguese', level: 24, verified: true, about: 'Beach days, photography, and meeting kind people from everywhere.', interests: ['Photos', 'Fitness', 'Beach'] },
];

export function getRandomPartner(excludeId?: string): Partner {
  const choices = PARTNERS.filter((partner) => partner.id !== excludeId);
  return choices[Math.floor(Math.random() * choices.length)] ?? PARTNERS[0];
}
