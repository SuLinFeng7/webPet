export const STORAGE_KEYS = {
  enabled: "webpet:enabled",
  petVisible: "webpet:petVisible"
} as const;

export type StorageState = {
  [STORAGE_KEYS.enabled]: boolean;
  [STORAGE_KEYS.petVisible]: boolean;
};

export const DEFAULT_STATE: StorageState = {
  [STORAGE_KEYS.enabled]: true,
  [STORAGE_KEYS.petVisible]: true
};

export async function getState(): Promise<StorageState> {
  const raw = await chrome.storage.sync.get(Object.values(STORAGE_KEYS));
  return {
    [STORAGE_KEYS.enabled]: typeof raw[STORAGE_KEYS.enabled] === "boolean" ? raw[STORAGE_KEYS.enabled] : true,
    [STORAGE_KEYS.petVisible]:
      typeof raw[STORAGE_KEYS.petVisible] === "boolean" ? raw[STORAGE_KEYS.petVisible] : true
  };
}

export async function setState(patch: Partial<StorageState>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

