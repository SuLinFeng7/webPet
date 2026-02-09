export const ROOT_ID = "webpet-root";
export const WRAPPER_SIZE = 150; // 容器大小（像素），调整这个值可以改变小人的整体大小
export const PET_SCALE_MULTIPLIER = 1.0; // Spine 缩放倍数，1.0 为默认大小，可以调整（如 0.8 变小，1.2 变大）
export const ASSET_DIR = "assets/exusiai/";
export const ASSET_NAME = "build_char_103_angel";
export const IDLE_TIMEOUT_MS = 60_000; // 空闲 60s 自动切换为 sleep

// 动作名称中文映射字典
export const ACTION_NAMES: Record<string, string> = {
  default: "默认",
  interact: "交互",
  move: "移动",
  relax: "放松",
  sit: "坐下",
  sleep: "睡觉"
};

// 可选动作列表
export const SELECTABLE_ACTIONS = ["move", "relax", "sit", "sleep"];
