import { SELECTABLE_ACTIONS, ACTION_NAMES } from "./constants";

export class MenuManager {
  private bubble: HTMLDivElement;
  private onActionSelect: (action: string) => void;
  private menuVisible = false;

  constructor(bubble: HTMLDivElement, onActionSelect: (action: string) => void) {
    this.bubble = bubble;
    this.onActionSelect = onActionSelect;
  }

  show() {
    this.menuVisible = true;
    this.bubble.innerHTML = `
      <ul class="bubble-menu">
        ${SELECTABLE_ACTIONS.map((a) => `
          <li class="bubble-menu-item" data-act="${a}">
            ${ACTION_NAMES[a] || a}
          </li>
        `).join("")}
      </ul>
    `;
    this.bubble.classList.add("show");
    
    // 使用事件委托
    const handleMenuClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const item = target.closest(".bubble-menu-item[data-act]") as HTMLElement;
      if (item) {
        e.preventDefault();
        e.stopPropagation();
        const act = item.dataset.act;
        if (act) {
          console.log(`[webPet] 菜单选择动作: ${act}`);
          this.hide();
          // 延迟执行，确保菜单已隐藏
          setTimeout(() => {
            this.onActionSelect(act);
          }, 0);
        }
      }
    };
    
    this.bubble.addEventListener("click", handleMenuClick, { once: true });
  }

  hide() {
    this.menuVisible = false;
    this.bubble.classList.remove("show");
  }

  isVisible(): boolean {
    return this.menuVisible;
  }
}
