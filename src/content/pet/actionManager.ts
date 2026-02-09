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

  setAction(name: string, skipCallback = false): boolean {
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
    const isLoop = target !== "interact";
    
    console.log(`[webPet] 设置动作: ${target} (${originalName}), 循环: ${isLoop}`);
    
    // 清除之前的动画（这会自动清除监听器）
    this.spine.state.clearTracks();
    
    // 设置新动画
    const trackEntry = this.spine.state.setAnimation(0, originalName, isLoop);
    this.currentAction = target;
    
    // interact 动作播放完成后自动切换到 relax
    if (target === "interact" && trackEntry) {
      console.log("[webPet] 设置 interact complete 监听器");
      
      // 使用 trackEntry 的 complete 回调（如果存在）
      if (trackEntry.listener && typeof trackEntry.listener === "function") {
        const originalListener = trackEntry.listener;
        trackEntry.listener = (entry: any, event: any) => {
          if (originalListener) originalListener(entry, event);
          if (event && event.data && event.data.name === "complete") {
            console.log("[webPet] interact complete 事件触发（通过 listener）");
            if (this.currentAction === "interact") {
              console.log("[webPet] interact 完成，自动切换到 relax");
              this.setAction("relax", true);
            }
          }
        };
      }
      
      // 延迟获取 track，确保 track 已创建
      setTimeout(() => {
        const track = this.spine.state.tracks[0];
        if (track && this.currentAction === "interact") {
          // 尝试使用 track 的 complete 事件
          const onComplete = () => {
            console.log("[webPet] interact complete 事件触发");
            if (this.currentAction === "interact") {
              console.log("[webPet] interact 完成，自动切换到 relax");
              this.setAction("relax", true);
            }
          };
          
          if (track.addListener) {
            track.addListener("complete", onComplete);
            console.log("[webPet] 使用 addListener 添加监听器");
          } else if (track.on) {
            track.on("complete", onComplete);
            console.log("[webPet] 使用 on 添加监听器");
          } else {
            // 使用轮询方式检查动画是否完成
            console.log("[webPet] 使用轮询方式检查动画完成");
            const startTime = Date.now();
            const checkComplete = () => {
              if (this.currentAction !== "interact") {
                console.log("[webPet] 动作已改变，停止检测");
                return;
              }
              const currentTrack = this.spine.state.tracks[0];
              if (!currentTrack) {
                requestAnimationFrame(checkComplete);
                return;
              }
              
              // 获取动画时长
              const animation = currentTrack.animation;
              if (!animation) {
                requestAnimationFrame(checkComplete);
                return;
              }
              
              const animationDuration = animation.duration || 0;
              const trackTime = currentTrack.trackTime || 0;
              
              // 如果 trackTime 达到或超过动画时长，说明动画完成
              if (animationDuration > 0 && trackTime >= animationDuration - 0.05) {
                console.log(`[webPet] interact 完成（轮询检测，trackTime=${trackTime.toFixed(2)}/${animationDuration.toFixed(2)}），自动切换到 relax`);
                this.setAction("relax", true);
                return;
              }
              
              // 如果超过 5 秒还没完成，强制切换（防止卡死）
              if (Date.now() - startTime > 5000) {
                console.log("[webPet] interact 超时，强制切换到 relax");
                this.setAction("relax", true);
                return;
              }
              
              requestAnimationFrame(checkComplete);
            };
            requestAnimationFrame(checkComplete);
          }
        }
      }, 50);
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
