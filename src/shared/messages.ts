export const MESSAGE_NAMESPACE = "webPet" as const;

export type WebPetMessage =
  | {
      ns: typeof MESSAGE_NAMESPACE;
      type: "PING";
    }
  | {
      ns: typeof MESSAGE_NAMESPACE;
      type: "TOGGLE_PET";
    }
  | {
      ns: typeof MESSAGE_NAMESPACE;
      type: "SET_ENABLED";
      enabled: boolean;
    }
  | {
      ns: typeof MESSAGE_NAMESPACE;
      type: "GET_STATE";
    };

export type WebPetResponse =
  | { ok: true; data?: unknown }
  | { ok: false; error: { message: string } };

export function isWebPetMessage(x: unknown): x is WebPetMessage {
  if (!x || typeof x !== "object") return false;
  const t = (x as any).type;
  return (x as any).ns === MESSAGE_NAMESPACE && typeof t === "string";
}

