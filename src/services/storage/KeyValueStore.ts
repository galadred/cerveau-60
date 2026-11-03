/** Abstraction minimale d'un stockage clé/valeur JSON. */
export interface KeyValueStore {
  get<T>(key: string): T | null;
  set<T>(key: string, value: T): void;
  remove(key: string): void;
}

const PREFIX = 'cerveau60:';

/**
 * Implémentation localStorage, tolérante aux erreurs :
 * navigation privée, quota dépassé ou JSON corrompu ne font jamais planter le jeu.
 */
export class LocalStorageStore implements KeyValueStore {
  private memory = new Map<string, string>();

  private get storage(): Storage | null {
    try {
      return typeof window !== 'undefined' ? window.localStorage : null;
    } catch {
      return null;
    }
  }

  get<T>(key: string): T | null {
    let raw: string | null = null;
    try {
      raw = this.storage?.getItem(PREFIX + key) ?? null;
    } catch {
      raw = null;
    }
    raw ??= this.memory.get(key) ?? null;
    if (raw == null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }

  set<T>(key: string, value: T): void {
    const raw = JSON.stringify(value);
    this.memory.set(key, raw);
    try {
      this.storage?.setItem(PREFIX + key, raw);
    } catch {
      /* quota / mode privé : on garde la copie mémoire */
    }
  }

  remove(key: string): void {
    this.memory.delete(key);
    try {
      this.storage?.removeItem(PREFIX + key);
    } catch {
      /* ignore */
    }
  }
}
