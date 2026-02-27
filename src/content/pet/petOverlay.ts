import { getState, setState, StorageState, STORAGE_KEYS } from "@shared/storage";
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

  const doAction = (action: string, fromSync = false, forceLoop?: boolean) => {
    if (actionManager?.getCurrentAction() !== action || forceLoop !== undefined) {
      actionManager?.setAction(action, false, forceLoop);
      if (!fromSync) {
        setState({ [STORAGE_KEYS.petAction]: action }).catch(console.error);
      }
    }
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
      // removed eventMode to fix lint
    });
    console.log("[webPet] PIXI Application 创建成功，渲染器类型:", app.renderer.type === PIXI.RENDERER_TYPE.CANVAS ? "Canvas" : "WebGL");
    
    wrapper.appendChild(app.view as HTMLCanvasElement);
    console.log("[webPet] Canvas 已添加到 DOM");
    
    console.log("[webPet] 开始加载 Spine 资源...");
    spine = await loadSpine(app);
    console.log("[webPet] Spine 加载成功");
    
    app.stage.addChild(spine);
    
    // Enable spine interactivity so we can catch clicks precisely on drawn pixels/bounds!
    // @ts-ignore compatibility with different pixi versions
    spine.interactive = true; 
    // @ts-ignore
    spine.cursor = "grab";
    console.log("[webPet] Spine 已添加到舞台并开启互动");
    
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
  let currentLeft = 24;
  let currentTop = 180;
  let dragStartLeft = 24;
  let dragStartTop = 180;

  function setPos(left: number, top: number, fromSync = false) {
    const vw = doc.defaultView?.innerWidth ?? 1024;
    const vh = doc.defaultView?.innerHeight ?? 768;
    const w = WRAPPER_SIZE;
    const h = WRAPPER_SIZE;
    const nextLeft = clamp(left, 0, vw - w);
    const nextTop = clamp(top, 0, vh - h);
    wrapper.style.left = `${nextLeft}px`;
    wrapper.style.top = `${nextTop}px`;
    currentLeft = nextLeft;
    currentTop = nextTop;
    
    if (!fromSync && !dragging) {
      // Avoid sending rapid syncs by using a simple debounce or on mouse up
    }
  }

  const initPos = st[STORAGE_KEYS.petPosition];
  if (initPos) {
    setPos(initPos.x, initPos.y, true);
  } else {
    setPos(currentLeft, currentTop, true);
  }
  
  if (st[STORAGE_KEYS.petAction]) {
    doAction(st[STORAGE_KEYS.petAction], true);
  }

  let pressTimer: number | null = null;
  let longPress = false;
  let hasMoved = false;

  let currentRotation = 0;
  let targetRotation = 0;
  let rotVelocity = 0;
  let grabX = WRAPPER_SIZE / 2;
  let grabY = WRAPPER_SIZE / 2;
  let physicsRaf: number | null = null;
  let lastMouseX = 0;

  const physicsLoop = () => {
    const spring = 0.12;
    const damp = 0.82;
    const force = ((dragging ? targetRotation : 0) - currentRotation) * spring;
    rotVelocity += force;
    rotVelocity *= damp;
    currentRotation += rotVelocity;
    
    if (Math.abs(currentRotation) > 0.001 || Math.abs(rotVelocity) > 0.001) {
      wrapper.style.transform = `translateZ(0) rotate(${currentRotation}rad)`;
    } else {
      currentRotation = 0;
      wrapper.style.transform = `translateZ(0)`;
    }
    physicsRaf = requestAnimationFrame(physicsLoop);
  };
  physicsRaf = requestAnimationFrame(physicsLoop);

  const onPointerDownWrapped = (e: PointerEvent) => {
    if (e.button !== 0) return;
    
    // hitTest: check if mouse is on actual spine character pixels/bounds, not just the canvas square
    let hit = true;
    if (app && spine) {
      const rect = wrapper.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;
      
      const petWidth = 75;
      const petHeight = 110;
      
      // 假设小人水平居中，垂直稍微偏下（底部在 Canvas 底部，或者居中偏下）
      const cx = WRAPPER_SIZE / 2;
      const cy = WRAPPER_SIZE / 2 + 10;
      
      const isWithinWidth = Math.abs(clientX - cx) <= petWidth / 2;
      const isWithinHeight = Math.abs(clientY - cy) <= petHeight / 2;
      
      if (!isWithinWidth || !isWithinHeight) {
        hit = false;
      }
    }
    
    if (!hit) return; // ignore click if it's in the empty corners
    
    // 如果弹窗打开，点击小人身上任何部位都先关闭弹窗，不引起拖拽和交互
    if (menuManager?.isVisible()) {
      const isMenuClick = (e.target as HTMLElement | null)?.closest(".bubble");
      if (!isMenuClick) {
        menuManager.hide();
        return;
      }
    }
    
    longPress = false;
    hasMoved = false;
    dragging = true;
    const target = e.target as HTMLElement | null;
    target?.setPointerCapture?.(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
    const rect = wrapper.getBoundingClientRect();
    dragStartLeft = rect.left;
    dragStartTop = rect.top;
    
    // Physics grab offset
    grabX = e.clientX - rect.left;
    grabY = e.clientY - rect.top;
    wrapper.style.transformOrigin = `${grabX}px ${grabY}px`;
    
    const dx = WRAPPER_SIZE / 2 - grabX;
    const dy = WRAPPER_SIZE / 2 - grabY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 20) {
      targetRotation = Math.PI / 2 - Math.atan2(dy, dx);
      if (targetRotation > Math.PI) targetRotation -= Math.PI * 2;
      if (targetRotation < -Math.PI) targetRotation += Math.PI * 2;
    } else {
      targetRotation = 0;
    }
    lastMouseX = e.clientX;
    
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
      if (!hasMoved) {
        hasMoved = true;
        // 开始拖拽时，触发保持循环的 interact 动画
        movementManager?.stopMove();
        doAction("interact", false, true);
      }
      if (pressTimer) {
        window.clearTimeout(pressTimer);
        pressTimer = null;
      }
    }
    
    const vX = e.clientX - lastMouseX;
    lastMouseX = e.clientX;
    const swing = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, vX * 0.015));
    
    const grabDx = WRAPPER_SIZE / 2 - grabX;
    const grabDy = WRAPPER_SIZE / 2 - grabY;
    if (Math.sqrt(grabDx * grabDx + grabDy * grabDy) > 20) {
      let baseTarget = Math.PI / 2 - Math.atan2(grabDy, grabDx);
      if (baseTarget > Math.PI) baseTarget -= Math.PI * 2;
      if (baseTarget < -Math.PI) baseTarget += Math.PI * 2;
      targetRotation = baseTarget - swing;
    } else {
      targetRotation = -swing;
    }
    
    setPos(dragStartLeft + (e.clientX - startX), dragStartTop + (e.clientY - startY));
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
    
    // 如果没有移动且不是长按，则触发 单纯不循环的 interact（然后会自动转回 relax）
    if (!hasMoved && !longPress) {
      console.log("[webPet] 短按触发 interact");
      movementManager?.stopMove();
      doAction("interact");
    }
    
    // 如果有移动且拖拽完成，切回 relax
    if (hasMoved) {
      doAction("relax");
      setState({
        [STORAGE_KEYS.petPosition]: { x: currentLeft, y: currentTop }
      }).catch(console.error);
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

  const onGlobalPointerDown = (e: PointerEvent) => {
    if (menuManager?.isVisible()) {
      const target = e.target as HTMLElement | null;
      if (!target?.closest('.bubble')) {
        menuManager.hide();
      }
    }
  };

  wrapper.addEventListener("pointerdown", onPointerDownWrapped);
  doc.addEventListener("pointerdown", onGlobalPointerDown, { capture: true });
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
    if (physicsRaf) cancelAnimationFrame(physicsRaf);
    wrapper.removeEventListener("pointerdown", onPointerDownWrapped);
    doc.removeEventListener("pointerdown", onGlobalPointerDown, { capture: true });
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

  const updateState = (newState: StorageState) => {
    if (newState[STORAGE_KEYS.petAction] && actionManager?.getCurrentAction() !== newState[STORAGE_KEYS.petAction]) {
      doAction(newState[STORAGE_KEYS.petAction], true);
    }
    if (newState[STORAGE_KEYS.petPosition] && !dragging) {
      const pos = newState[STORAGE_KEYS.petPosition];
      if (pos) {
        const { x, y } = pos;
        // Only set pos if the delta is significant
        const dx = Math.abs(x - currentLeft);
        const dy = Math.abs(y - currentTop);
        if (dx > 10 || dy > 10) {
          setPos(x, y, true);
        }
      }
    }
  };

  return { root, wrapper, cleanup, updateState };
}
