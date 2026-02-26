import { getState, STORAGE_KEYS } from "@shared/storage";
import * as PIXI from "pixi.js-legacy";
import { ROOT_ID, WRAPPER_SIZE, IDLE_TIMEOUT_MS } from "./constants";
import { PetRuntime } from "./types";
import { ensureStyles } from "./styles";
import { loadSpine } from "./spineLoader";
import { ActionManager } from "./actionManager";
import { MovementManager } from "./movement";
import { MenuManager } from "./menu";

// 将 PIXI 挂载到全局，pixi-spine 需要访问全局 PIXI 才能正确注册
(window as any).PIXI = PIXI;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export async function mountPetOverlay(doc: Document): Promise<PetRuntime | null> {
  const st = await getState();
  if (!st[STORAGE_KEYS.enabled]) return null;
  if (!st[STORAGE_KEYS.petVisible]) return null;

  if (doc.getElementById(ROOT_ID)) return null;
  ensureStyles(doc);

  const root = doc.createElement("div");
  root.id = ROOT_ID;

  const wrapper = doc.createElement("div");
  wrapper.className = "webpet";

  const bubble = doc.createElement("div");
  bubble.className = "bubble";

  wrapper.appendChild(bubble);
  root.appendChild(wrapper);
  doc.body.appendChild(root);

  let app: PIXI.Application | null = null;
  let spine: any | null = null;
  let actionManager: ActionManager | null = null;
  let movementManager: MovementManager | null = null;
  let menuManager: MenuManager | null = null;
  let idleTimer: number | null = null;

  const resetIdleTimer = () => {
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      console.log("[webPet] 空闲超时，切换 sleep");
      doAction("sleep");
    }, IDLE_TIMEOUT_MS);
  };

  const doAction = (action: string) => {
    actionManager?.setAction(action);
    resetIdleTimer();
  };

  try {
    console.log("[webPet] 开始创建 PIXI Application...");
    app = new PIXI.Application({
      width: WRAPPER_SIZE,
      height: WRAPPER_SIZE,
      backgroundAlpha: 0,
      antialias: true,
      powerPreference: "low-power"
    });
    console.log("[webPet] PIXI Application 创建成功，渲染器类型:", app.renderer.type === PIXI.RENDERER_TYPE.CANVAS ? "Canvas" : "WebGL");
    
    wrapper.appendChild(app.view as HTMLCanvasElement);
    console.log("[webPet] Canvas 已添加到 DOM");
    
    console.log("[webPet] 开始加载 Spine 资源...");
    spine = await loadSpine(app);
    console.log("[webPet] Spine 加载成功");
    
    app.stage.addChild(spine);
    console.log("[webPet] Spine 已添加到舞台");
    
    // 获取所有动画名称
    const allAnimations = spine.spineData.animations.map((a: { name: string }) => a.name);
    
    // 初始化管理器
    actionManager = new ActionManager(spine, allAnimations);
    movementManager = new MovementManager(wrapper, doc);
    
    // 设置动作变化回调（统一处理移动逻辑）
    actionManager.setOnActionChange((action) => {
      console.log(`[webPet] 动作变化回调: ${action}`);
      if (action === "move") {
        movementManager?.startMove();
      } else {
        movementManager?.stopMove();
      }
    });
    
    // 菜单回调只负责设置动作，移动逻辑由 onActionChange 处理
    menuManager = new MenuManager(bubble, (action) => {
      console.log(`[webPet] 菜单选择: ${action}`);
      doAction(action);
    });
    
    // 强制更新一次渲染
    app.renderer.render(app.stage);
    resetIdleTimer();
  } catch (e) {
    const errorMsg = e instanceof Error ? `${e.message} (${e.stack})` : String(e);
    console.error("[webPet] 加载失败:", e);
    bubble.textContent = `加载失败: ${errorMsg}`;
    bubble.classList.add("show");
  }

  let dragging = false;
  let startX = 0;
  let startY = 0;
  let startLeft = 24;
  let startTop = 180;

  function setPos(left: number, top: number) {
    const vw = doc.defaultView?.innerWidth ?? 1024;
    const vh = doc.defaultView?.innerHeight ?? 768;
    const w = WRAPPER_SIZE;
    const h = WRAPPER_SIZE;
    const nextLeft = clamp(left, 0, vw - w);
    const nextTop = clamp(top, 0, vh - h);
    wrapper.style.left = `${nextLeft}px`;
    wrapper.style.top = `${nextTop}px`;
  }

  setPos(startLeft, startTop);

  let pressTimer: number | null = null;
  let longPress = false;
  let hasMoved = false;

  const onPointerDownWrapped = (e: PointerEvent) => {
    if (e.button !== 0) return;
    longPress = false;
    hasMoved = false;
    dragging = true;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    const rect = wrapper.getBoundingClientRect();
    startLeft = rect.left;
    startTop = rect.top;
    
    if (pressTimer) window.clearTimeout(pressTimer);
    pressTimer = window.setTimeout(() => {
      if (!hasMoved) {
        longPress = true;
        dragging = false; // 长按时取消拖拽
        menuManager?.show();
      }
    }, 500);
  };

  const onPointerMoveWrapped = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = Math.abs(e.clientX - startX);
    const dy = Math.abs(e.clientY - startY);
    if (dx > 5 || dy > 5) {
      hasMoved = true;
      if (pressTimer) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
      }
    }
    setPos(startLeft + (e.clientX - startX), startTop + (e.clientY - startY));
  };

  const onPointerUpWrapped = (e: PointerEvent) => {
    if (e.button !== 0) return;
    dragging = false;
    if (pressTimer) {
      window.clearTimeout(pressTimer);
      pressTimer = null;
    }
    
    // 如果点击了菜单，不触发 interact
    if (menuManager?.isVisible()) {
      return;
    }
    
    // 如果没有移动且不是长按，则触发 interact（停止移动）
    if (!hasMoved && !longPress) {
      console.log("[webPet] 短按触发 interact");
      movementManager?.stopMove();
      doAction("interact");
    }
    
    longPress = false;
    hasMoved = false;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.altKey || e.key === "Alt") {
      wrapper.style.pointerEvents = "none";
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    if (!e.altKey && e.key === "Alt") {
      wrapper.style.pointerEvents = "auto";
    }
  };

  const handleVisibilityChange = () => {
    if (doc.hidden) {
      console.log("[webPet] 页面隐藏，停止渲染");
      app?.ticker.stop();
    } else {
      console.log("[webPet] 页面显示，恢复渲染");
      app?.ticker.start();
    }
  };

  wrapper.addEventListener("pointerdown", onPointerDownWrapped);
  doc.addEventListener("pointermove", onPointerMoveWrapped);
  doc.addEventListener("pointerup", onPointerUpWrapped);
  doc.addEventListener("pointerdown", resetIdleTimer);
  doc.addEventListener("keydown", onKeyDown);
  doc.addEventListener("keyup", onKeyUp);
  doc.addEventListener("visibilitychange", handleVisibilityChange);

  // 当窗口失去焦点时恢复 pointer-events 防止卡死
  window.addEventListener("blur", () => {
    wrapper.style.pointerEvents = "auto";
  });

  const cleanup = () => {
    wrapper.removeEventListener("pointerdown", onPointerDownWrapped);
    doc.removeEventListener("pointermove", onPointerMoveWrapped);
    doc.removeEventListener("pointerup", onPointerUpWrapped);
    doc.removeEventListener("pointerdown", resetIdleTimer);
    doc.removeEventListener("keydown", onKeyDown);
    doc.removeEventListener("keyup", onKeyUp);
    doc.removeEventListener("visibilitychange", handleVisibilityChange);
    movementManager?.cleanup();
    if (app) {
      app.destroy(true, { children: true, texture: true, baseTexture: true });
    }
    root.remove();
  };

  return { root, wrapper, cleanup };
}
