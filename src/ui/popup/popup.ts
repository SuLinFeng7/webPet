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
  const statusEl = qs("status");
  const toggleBtn = qs("toggle") as HTMLButtonElement;
  const optionsBtn = qs("openOptions") as HTMLButtonElement;

  const st = await getState();
  statusEl.textContent = st[STORAGE_KEYS.petVisible] ? "宠物：显示中" : "宠物：隐藏";

  toggleBtn.addEventListener("click", async () => {
    const res = await send({ type: "TOGGLE_PET" });
    if (!res.ok) return;
    const next = (res.data as any)?.petVisible as boolean | undefined;
    if (typeof next === "boolean") {
      statusEl.textContent = next ? "宠物：显示中" : "宠物：隐藏";
    }
  });

  optionsBtn.addEventListener("click", async () => {
    await chrome.runtime.openOptionsPage();
  });
}

init().catch(() => {});

