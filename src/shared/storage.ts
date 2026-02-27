export const STORAGE_KEYS = {
  enabled: "webpet:enabled",
  petVisible: "webpet:petVisible",
  petAction: "webpet:petAction",
  petPosition: "webpet:petPosition",
  activeTabId: "webpet:activeTabId"
} as const;

export type StorageState = {
  [STORAGE_KEYS.enabled]: boolean;
  [STORAGE_KEYS.petVisible]: boolean;
  [STORAGE_KEYS.petAction]: string;
  [STORAGE_KEYS.petPosition]: { x: number; y: number } | null;
  [STORAGE_KEYS.activeTabId]: string | null;
};

export const DEFAULT_STATE: StorageState = {
  [STORAGE_KEYS.enabled]: true,
  [STORAGE_KEYS.petVisible]: true,
  [STORAGE_KEYS.petAction]: "relax",
  [STORAGE_KEYS.petPosition]: null,
  [STORAGE_KEYS.activeTabId]: null
};

export async function getState(): Promise<StorageState> {
  const syncRaw = await chrome.storage.sync.get([STORAGE_KEYS.enabled, STORAGE_KEYS.petVisible]);
  const localRaw = await chrome.storage.local.get([STORAGE_KEYS.petAction, STORAGE_KEYS.petPosition, STORAGE_KEYS.activeTabId]);
  return {
    [STORAGE_KEYS.enabled]: typeof syncRaw[STORAGE_KEYS.enabled] === "boolean" ? syncRaw[STORAGE_KEYS.enabled] : true,
    [STORAGE_KEYS.petVisible]: typeof syncRaw[STORAGE_KEYS.petVisible] === "boolean" ? syncRaw[STORAGE_KEYS.petVisible] : true,
    [STORAGE_KEYS.petAction]: typeof localRaw[STORAGE_KEYS.petAction] === "string" ? localRaw[STORAGE_KEYS.petAction] : "relax",
    [STORAGE_KEYS.petPosition]: localRaw[STORAGE_KEYS.petPosition] || null,
    [STORAGE_KEYS.activeTabId]: localRaw[STORAGE_KEYS.activeTabId] || null
  };
}

export async function setState(patch: Partial<StorageState>): Promise<void> {
  const syncPatch: Record<string, any> = {};
  const localPatch: Record<string, any> = {};

  if (STORAGE_KEYS.enabled in patch) syncPatch[STORAGE_KEYS.enabled] = patch[STORAGE_KEYS.enabled];
  if (STORAGE_KEYS.petVisible in patch) syncPatch[STORAGE_KEYS.petVisible] = patch[STORAGE_KEYS.petVisible];

  if (STORAGE_KEYS.petAction in patch) localPatch[STORAGE_KEYS.petAction] = patch[STORAGE_KEYS.petAction];
  if (STORAGE_KEYS.petPosition in patch) localPatch[STORAGE_KEYS.petPosition] = patch[STORAGE_KEYS.petPosition];
  if (STORAGE_KEYS.activeTabId in patch) localPatch[STORAGE_KEYS.activeTabId] = patch[STORAGE_KEYS.activeTabId];

  const p = [];
  if (Object.keys(syncPatch).length > 0) p.push(chrome.storage.sync.set(syncPatch));
  if (Object.keys(localPatch).length > 0) p.push(chrome.storage.local.set(localPatch));
  
  await Promise.all(p);
}

