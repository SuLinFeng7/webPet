import { mountPetOverlay } from "./pet/petOverlay";
import { getState, setState, STORAGE_KEYS } from "@shared/storage";

const CURRENT_TAB_ID = Math.random().toString(36).substring(2, 15);

let runtime: Awaited<ReturnType<typeof mountPetOverlay>> | null = null;

async function syncPet() {
  const st = await getState();
  const shouldShow =
    st[STORAGE_KEYS.enabled] &&
    st[STORAGE_KEYS.petVisible] &&
    st[STORAGE_KEYS.activeTabId] === CURRENT_TAB_ID;

  if (shouldShow && !runtime) {
    runtime = await mountPetOverlay(document);
    return;
  }

  if (shouldShow && runtime) {
    runtime.updateState(st);
    return;
  }

  if (!shouldShow && runtime) {
    runtime.cleanup();
    runtime = null;
  }
}

function claimPet() {
  setState({ [STORAGE_KEYS.activeTabId]: CURRENT_TAB_ID }).catch(() => {});
}

document.addEventListener("pointerdown", claimPet, { capture: true });
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) claimPet();
});
window.addEventListener("focus", claimPet);

if (!document.hidden) {
  claimPet();
}

syncPet().catch(() => {});

chrome.storage.onChanged.addListener(() => {
  syncPet().catch(() => {});
});
