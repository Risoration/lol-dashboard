type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

class InMemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

// Persist across hot reloads in dev
const globalKey = '__LOL_DASHBOARD_CACHE__';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const anyGlobal = globalThis as any;
const cache: InMemoryCache = anyGlobal[globalKey] || new InMemoryCache();
anyGlobal[globalKey] = cache;

export default cache;
