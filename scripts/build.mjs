import { build } from "esbuild";
import { mkdir, cp, rm, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const distDir = path.join(root, "dist");
const publicDir = path.join(root, "public");
const assetsDir = path.join(root, "assets");

const watch = process.argv.includes("--watch");

async function copyPublic() {
  await mkdir(distDir, { recursive: true });
  await cp(publicDir, distDir, { recursive: true });
}

async function copyAssets() {
  try {
    const s = await stat(assetsDir);
    if (s.isDirectory()) {
      await cp(assetsDir, path.join(distDir, "assets"), { recursive: true });
    }
  } catch {
    // ignore if assets not present
  }
}

async function cleanDist() {
  await rm(distDir, { recursive: true, force: true });
}

const common = {
  bundle: true,
  format: "esm",
  target: "es2022",
  sourcemap: true,
  platform: "browser",
  outbase: "src",
  outdir: distDir,
  tsconfig: path.join(root, "tsconfig.json"),
  alias: {
    "@shared": path.join(root, "src/shared")
  },
  logLevel: "info"
};

async function runBuild() {
  await cleanDist();
  await copyPublic();
  await copyAssets();

  await build({
    ...common,
    entryPoints: [
      "src/background/service-worker.ts",
      "src/content/content-script.ts",
      "src/ui/popup/popup.ts",
      "src/ui/options/options.ts"
    ],
    entryNames: "[dir]/[name]"
  });
}

if (!watch) {
  await runBuild();
} else {
  await cleanDist();
  await copyPublic();
  await copyAssets();
  const ctx = await (await import("esbuild")).context({
    ...common,
    entryPoints: [
      "src/background/service-worker.ts",
      "src/content/content-script.ts",
      "src/ui/popup/popup.ts",
      "src/ui/options/options.ts"
    ],
    entryNames: "[dir]/[name]"
  });
  await ctx.watch();
  console.log("[webPet] watching...");
}

