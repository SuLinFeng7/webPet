import { isWebPetMessage, type WebPetMessage, type WebPetResponse } from "@shared/messages";
import { getState, setState, STORAGE_KEYS } from "@shared/storage";

chrome.runtime.onInstalled.addListener(async () => {
  // 初始化默认配置（如果没有）
  const cur = await getState();
  await setState(cur);
});

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  (async () => {
    if (!isWebPetMessage(message)) {
      const res: WebPetResponse = { ok: false, error: { message: "Invalid message" } };
      sendResponse(res);
      return;
    }

    const msg = message as WebPetMessage;
    if (msg.type === "PING") {
      const res: WebPetResponse = { ok: true, data: { pong: true } };
      sendResponse(res);
      return;
    }

    if (msg.type === "GET_STATE") {
      const res: WebPetResponse = { ok: true, data: await getState() };
      sendResponse(res);
      return;
    }

    if (msg.type === "TOGGLE_PET") {
      const st = await getState();
      const next = !st[STORAGE_KEYS.petVisible];
      await setState({ [STORAGE_KEYS.petVisible]: next });
      const res: WebPetResponse = { ok: true, data: { petVisible: next } };
      sendResponse(res);
      return;
    }

    if (msg.type === "SET_ENABLED") {
      await setState({ [STORAGE_KEYS.enabled]: msg.enabled });
      const res: WebPetResponse = { ok: true, data: { enabled: msg.enabled } };
      sendResponse(res);
      return;
    }

    const res: WebPetResponse = { ok: false, error: { message: "Unknown message type" } };
    sendResponse(res);
  })().catch((e) => {
    const res: WebPetResponse = { ok: false, error: { message: e instanceof Error ? e.message : String(e) } };
    sendResponse(res);
  });

  return true; // keep message channel open for async
});

