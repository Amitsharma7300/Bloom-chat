import type { AdStatus } from './api';
export async function showDueAd(_status: AdStatus): Promise<'impression' | 'failed' | 'unavailable'> { return 'unavailable'; }
