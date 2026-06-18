type StorageFacade = Pick<Storage, "length" | "clear" | "getItem" | "setItem" | "removeItem" | "key">;

const createMemoryStorage = (): StorageFacade => {
  const data = new Map<string, string>();

  return {
    get length() {
      return data.size;
    },
    clear: () => {
      data.clear();
    },
    getItem: (key: string) => {
      return data.has(key) ? data.get(key) ?? null : null;
    },
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
    removeItem: (key: string) => {
      data.delete(key);
    },
    key: (index: number) => {
      if (index < 0 || !Number.isInteger(index)) return null;
      return Array.from(data.keys())[index] ?? null;
    },
  };
};

const createSafeStorage = (kind: "local" | "session"): StorageFacade => {
  if (typeof window === "undefined") return createMemoryStorage();

  const storage = kind === "local" ? window.localStorage : window.sessionStorage;
  try {
    const probe = `__storage_probe_${kind}__`;
    storage.setItem(probe, "1");
    storage.removeItem(probe);
    return storage;
  } catch {
    return createMemoryStorage();
  }
};

export const safeLocalStorage: StorageFacade = createSafeStorage("local");
export const safeSessionStorage: StorageFacade = createSafeStorage("session");

export const getStorageItem = (
  storage: StorageFacade,
  key: string,
  fallback: string | null = null
): string | null => {
  try {
    return storage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const setStorageItem = (storage: StorageFacade, key: string, value: string): void => {
  try {
    storage.setItem(key, value);
  } catch {
    // Intentionally silent: callers can proceed with memory-only persistence.
  }
};

export const removeStorageItem = (storage: StorageFacade, key: string): void => {
  try {
    storage.removeItem(key);
  } catch {
    // Intentionally silent.
  }
};
