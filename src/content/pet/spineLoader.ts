import * as PIXI from "pixi.js-legacy";
import { ASSET_DIR, ASSET_NAME, PET_SCALE_MULTIPLIER } from "./constants";

export async function loadSpine(app: PIXI.Application): Promise<any> {
  // 动态导入 pixi-spine，避免模块加载时的注册错误
  console.log("[webPet] 动态导入 pixi-spine...");
  const spineModule = await import("pixi-spine");
  const Spine = spineModule.Spine;
  console.log("[webPet] pixi-spine 导入成功");

  const base = chrome.runtime.getURL(ASSET_DIR);
  const spineUrl = `${base}${ASSET_NAME}.skel`;
  const atlasUrl = `${base}${ASSET_NAME}.atlas`;
  
  console.log("[webPet] 资源路径:", { base, spineUrl, atlasUrl });

  return await new Promise((resolve, reject) => {
    const loader = new PIXI.Loader();
    
    loader.onError.add((err: any) => {
      console.error("[webPet] Loader 错误:", err);
      reject(new Error(`资源加载失败: ${err.message || String(err)}`));
    });
    
    loader.add("exusiai", spineUrl, {
      metadata: {
        spineMetadata: {
          atlasUrl
        }
      },
      xhrType: PIXI.LoaderResource.XHR_RESPONSE_TYPE.BUFFER
    });

    loader.load((_ldr: any, resources: any) => {
      console.log("[webPet] Loader 完成，资源:", resources);
      const res = resources.exusiai as PIXI.LoaderResource & { spineData?: any };
      if (!res) {
        reject(new Error("资源 exusiai 不存在"));
        return;
      }
      if (!res.spineData) {
        console.error("[webPet] 资源数据:", res);
        reject(new Error("未能解析 Spine 数据，请检查资源文件"));
        return;
      }
      
      console.log("[webPet] 创建 Spine 实例...");
      const spine = new Spine(res.spineData);
      const viewW = app.view.width;
      const viewH = app.view.height;
      spine.x = viewW / 2;
      spine.y = viewH - 10;

      const animations = spine.spineData.animations.map((a: { name: string }) => a.name);
      const animationsLower = animations.map((a) => a.toLowerCase());
      console.log("[webPet] 可用动画:", animationsLower);
      
      // 排除 default，优先选择 relax 或 sit 作为初始动作
      const prefer = ["relax", "sit", "interact"];
      const pick = prefer.find((p) => animationsLower.includes(p)) ?? animationsLower.find((a) => a !== "default") ?? animationsLower[0];
      if (pick) {
        // 找到原始大小写的动画名称
        const originalName = animations.find((a) => a.toLowerCase() === pick) ?? pick;
        console.log("[webPet] 播放动画:", originalName);
        spine.state.setAnimation(0, originalName, true);
      }
      
      let scale = 1;
      const bounds = spine.getBounds();
      console.log("[webPet] Spine 边界:", bounds);
      if (bounds.height > 0) {
        // 计算基础缩放，然后应用缩放倍数
        const baseScale = Math.min(viewH / (bounds.height * 1.4), viewW / (bounds.width * 1.2));
        scale = baseScale * PET_SCALE_MULTIPLIER;
      }
      spine.scale.set(scale);
      console.log("[webPet] Spine 缩放:", scale, `(基础缩放 × ${PET_SCALE_MULTIPLIER})`);
      resolve(spine);
    });
  });
}
