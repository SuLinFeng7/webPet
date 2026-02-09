import { ROOT_ID, WRAPPER_SIZE } from "./constants";

export function ensureStyles(doc: Document): void {
  const styleId = "webpet-style";
  if (doc.getElementById(styleId)) return;
  const style = doc.createElement("style");
  style.id = styleId;
  style.textContent = `
    #${ROOT_ID} {
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 2147483647;
    }
    #${ROOT_ID} .webpet {
      width: ${WRAPPER_SIZE}px;
      height: ${WRAPPER_SIZE}px;
      position: absolute;
      left: 24px;
      top: 180px;
      pointer-events: auto;
      user-select: none;
      cursor: grab;
      transform: translateZ(0);
    }
    #${ROOT_ID} .webpet:active { cursor: grabbing; }
    #${ROOT_ID} canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    #${ROOT_ID} .bubble {
      position: absolute;
      left: 50%;
      top: -80px;
      transform: translateX(-50%) translateY(4px) scale(0.95);
      min-width: 180px;
      background: #fff;
      color: rgba(0, 0, 0, 0.85);
      padding: 0;
      border-radius: 20px;
      font-size: 14px;
      line-height: 1.5715;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      white-space: nowrap;
      box-shadow: 0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05);
      border: 1px solid rgba(0, 0, 0, 0.06);
      overflow: hidden;
    }
    #${ROOT_ID} .bubble.show {
      opacity: 1;
      transform: translateX(-50%) translateY(0) scale(1);
      pointer-events: auto;
    }
    #${ROOT_ID} .bubble .bubble-menu {
      padding: 8px 0;
      margin: 0;
      list-style: none;
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 4px;
    }
    #${ROOT_ID} .bubble .bubble-menu-item {
      position: relative;
      display: inline-block;
      padding: 6px 16px;
      margin: 0;
      color: rgba(0, 0, 0, 0.85);
      font-size: 13px;
      line-height: 20px;
      cursor: pointer;
      transition: background-color 0.2s;
      border: none;
      background: transparent;
      border-radius: 12px;
      white-space: nowrap;
    }
    #${ROOT_ID} .bubble .bubble-menu-item:hover {
      background-color: #f5f5f5;
    }
    #${ROOT_ID} .bubble .bubble-menu-item:active {
      background-color: #e6f7ff;
    }
  `;
  doc.documentElement.appendChild(style);
}
