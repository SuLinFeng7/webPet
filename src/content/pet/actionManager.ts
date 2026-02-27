import { ACTION_NAMES, SELECTABLE_ACTIONS } from "./constants";

export class ActionManager {
  private spine: any;
  private allAnimations: string[];
  private currentAction: string | null = null;
  private onActionChange?: (action: string) => void;

  constructor(spine: any, allAnimations: string[]) {
    this.spine = spine;
    this.allAnimations = allAnimations;
  }

  setOnActionChange(callback: (action: string) => void) {
    this.onActionChange = callback;
  }

  setAction(name: string, skipCallback = false, forceLoop?: boolean): boolean {
    if (!this.spine) return false;
    const target = name.toLowerCase();
    const allActions = this.allAnimations.map((a) => a.toLowerCase());
    const selectableActions = allActions.filter((a) => a !== "default");
    
    if (!selectableActions.includes(target)) {
      console.warn(`[webPet] 动作 ${target} 不在可选列表中`);
      return false;
    }
    
    // 找到原始大小写的动画名称
    const originalName = this.allAnimations.find((a) => a.toLowerCase() === target) ?? target;
    const isLoop = forceLoop !== undefined ? forceLoop : target !== "interact";
    
    console.log(`[webPet] 设置动作: ${target} (${originalName}), 循环: ${isLoop}`);
    
    // 清除之前的动画（这会自动清除监听器）
    this.spine.state.clearTracks();
    
    // 设置新动画
    const trackEntry = this.spine.state.setAnimation(0, originalName, isLoop);
    this.currentAction = target;
    
    // interact 动作（或任何非循环动作）播放完成后自动切换到 relax
    if (target === "interact" && trackEntry && !isLoop) {
      console.log("[webPet] 设置 interact complete 监听器");
      trackEntry.listener = {
        complete: () => {
          console.log("[webPet] 动画自然完成（Pixi Spine Listener），切换到 relax");
          if (this.currentAction === "interact") {
            this.setAction("relax", true);
          }
        }
      };
    }
    
    // 只有在不是跳过回调时才触发 onActionChange
    if (!skipCallback && this.onActionChange) {
      this.onActionChange(target);
    }
    
    return true;
  }

  getCurrentAction(): string | null {
    return this.currentAction;
  }

  getActionName(action: string): string {
    return ACTION_NAMES[action.toLowerCase()] || action;
  }
}
