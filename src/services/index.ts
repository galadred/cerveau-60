import { LocalStorageStore } from './storage/KeyValueStore';
import { createLocalRepositories } from './repositories/local';
import type { Repositories } from './repositories/types';

export type * from './repositories/types';

/**
 * Fabrique unique des dépôts.
 * Étape Supabase : si VITE_SUPABASE_URL est défini, retourner ici
 * `createSupabaseRepositories(client)` qui implémente les mêmes interfaces.
 */
export function createRepositories(): Repositories {
  return createLocalRepositories(new LocalStorageStore());
}
