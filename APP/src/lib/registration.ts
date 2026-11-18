import AsyncStorage from '@react-native-async-storage/async-storage';

const GENDER_KEY = '@bloom/registered-gender';

export type RegisteredGender = 'Man' | 'Woman';

export async function loadRegisteredGender(): Promise<RegisteredGender | null> {
  const value = await AsyncStorage.getItem(GENDER_KEY);
  return value === 'Man' || value === 'Woman' ? value : null;
}

export async function saveRegisteredGender(gender: RegisteredGender) {
  await AsyncStorage.setItem(GENDER_KEY, gender);
}

export async function clearRegistration() {
  await AsyncStorage.removeItem(GENDER_KEY);
}
