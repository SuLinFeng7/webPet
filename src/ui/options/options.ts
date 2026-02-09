import { MESSAGE_NAMESPACE, type WebPetMessage, type WebPetResponse } from "@shared/messages";
import { getState, STORAGE_KEYS } from "@shared/storage";

type WebPetMessageNoNs = WebPetMessage extends infer M ? (M extends { ns: any } ? Omit<M, "ns"> : never) : never;

function qs(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element: ${id}`);
  return el;
}

async function send(msg: WebPetMessageNoNs): Promise<WebPetResponse> {
  const full: WebPetMessage = { ...(msg as any), ns: MESSAGE_NAMESPACE };
  return await chrome.runtime.sendMessage(full);
}

async function init() {
  const enabledEl = qs("enabled") as HTMLInputElement;
  const st = await getState();
  enabledEl.checked = st[STORAGE_KEYS.enabled];

  enabledEl.addEventListener("change", async () => {
    const enabled = enabledEl.checked;
    const res = await send({ type: "SET_ENABLED", enabled });
    if (!res.ok) return;
  });
}

init().catch(() => {});

