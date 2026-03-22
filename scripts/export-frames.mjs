import fs from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";
import { chromium } from "playwright";

const toNumber = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const timestamp = new Date().toISOString().replaceAll(":", "-");
const baseUrl = process.env.BASE_URL ?? "http://127.0.0.1:4173";
const fps = toNumber(process.env.FPS, 60);
const seconds = toNumber(process.env.SECONDS, 24);
const width = toNumber(process.env.WIDTH, 1920);
const height = toNumber(process.env.HEIGHT, 1080);
const implementation =
  process.env.IMPLEMENTATION ?? process.env.PROJECT ?? "transformer";
const encodeVideo = process.env.ENCODE === "1";
const outputRoot = path.resolve(process.cwd(), "exports");
const runDir = path.join(outputRoot, `${implementation}-${timestamp}`);

const ensureServerReachable = async (url) => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Cannot reach ${url}. Start dev server first with "npm run dev -- --host 0.0.0.0 --port 4173".`,
      { cause: error },
    );
  }
};

const run = async () => {
  await ensureServerReachable(baseUrl);
  await fs.mkdir(runDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-angle=swiftshader",
      "--ignore-gpu-blocklist",
      "--enable-unsafe-swiftshader",
      "--disable-gpu-sandbox",
    ],
  });
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  const sceneUrl = `${baseUrl}/?capture=1&panel=0&implementation=${encodeURIComponent(implementation)}`;
  await page.goto(sceneUrl, { waitUntil: "networkidle" });
  await page.waitForSelector("canvas");
  await page.waitForFunction(
    () =>
      typeof window.__EXPLAINER_SET_PHASE === "function" &&
      typeof window.__EXPLAINER_STAGE_COUNT === "number",
  );

  const stageCount = await page.evaluate(
    () => window.__EXPLAINER_STAGE_COUNT ?? 5,
  );
  const totalFrames = Math.max(2, Math.round(fps * seconds));

  for (let frame = 0; frame < totalFrames; frame += 1) {
    const phase = (frame / (totalFrames - 1)) * stageCount;
    await page.evaluate((nextPhase) => {
      window.__EXPLAINER_SET_PHASE?.(nextPhase);
    }, phase);
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          requestAnimationFrame(() => resolve(true));
        }),
    );

    const filename = `frame-${String(frame).padStart(5, "0")}.png`;
    await page.screenshot({
      path: path.join(runDir, filename),
      type: "png",
    });
  }

  await browser.close();

  const ffmpegOutput = path.join(runDir, `${implementation}.mp4`);
  const ffmpegArgs = [
    "-y",
    "-framerate",
    String(fps),
    "-i",
    path.join(runDir, "frame-%05d.png"),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    ffmpegOutput,
  ];

  if (encodeVideo) {
    const ffmpegCheck = spawnSync("ffmpeg", ["-version"], { stdio: "ignore" });
    if (ffmpegCheck.status === 0) {
      const encode = spawnSync("ffmpeg", ffmpegArgs, { stdio: "inherit" });
      if (encode.status !== 0) {
        throw new Error("ffmpeg encoding failed.");
      }
      console.log(`Encoded video: ${ffmpegOutput}`);
    } else {
      console.log("ffmpeg not found. Frames were exported without encoding.");
    }
  }

  console.log(`Frames exported to: ${runDir}`);
  console.log(
    `Optional encode command:\nffmpeg ${ffmpegArgs.map((arg) => `"${arg}"`).join(" ")}`,
  );
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
