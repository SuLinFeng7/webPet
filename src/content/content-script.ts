import { mountPetOverlay } from "./pet/petOverlay";
import { getState, STORAGE_KEYS } from "@shared/storage";

let runtime: Awaited<ReturnType<typeof mountPetOverlay>> | null = null;

async function syncPet() {
  const st = await getState();
  const shouldShow = st[STORAGE_KEYS.enabled] && st[STORAGE_KEYS.petVisible];

  if (shouldShow && !runtime) {
    runtime = await mountPetOverlay(document);
    return;
  }

  if (!shouldShow && runtime) {
    runtime.cleanup();
    runtime = null;
  }
}

syncPet().catch(() => {});

chrome.storage.onChanged.addListener(() => {
  syncPet().catch(() => {});
});

