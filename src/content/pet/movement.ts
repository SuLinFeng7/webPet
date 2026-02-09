import { WRAPPER_SIZE } from "./constants";

export class MovementManager {
  private wrapper: HTMLDivElement;
  private doc: Document;
  private moveRaf: number | null = null;
  private isMoving = false;

  constructor(wrapper: HTMLDivElement, doc: Document) {
    this.wrapper = wrapper;
    this.doc = doc;
  }

  startMove() {
    if (this.isMoving) return;
    this.isMoving = true;
    
    let dir = 1;
    const speed = 1.2; // 像素/帧
    
    const step = () => {
      if (!this.isMoving) {
        this.moveRaf = null;
        return;
      }
      
      const rect = this.wrapper.getBoundingClientRect();
      const vw = this.doc.defaultView?.innerWidth ?? 1024;
      const nextLeft = rect.left + dir * speed;
      
      if (nextLeft < 0 || nextLeft + WRAPPER_SIZE > vw) {
        dir *= -1;
      } else {
        this.wrapper.style.left = `${nextLeft}px`;
      }
      
      this.moveRaf = requestAnimationFrame(step);
    };
    
    this.moveRaf = requestAnimationFrame(step);
  }

  stopMove() {
    this.isMoving = false;
    if (this.moveRaf) {
      cancelAnimationFrame(this.moveRaf);
      this.moveRaf = null;
    }
  }

  isCurrentlyMoving(): boolean {
    return this.isMoving;
  }

  cleanup() {
    this.stopMove();
  }
}
