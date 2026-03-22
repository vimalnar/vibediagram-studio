import process from "node:process";
import { spawn, spawnSync } from "node:child_process";

const toNumber = (value, fallback) => {
  if (value === undefined) {
    return fallback;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const port = toNumber(process.env.PREVIEW_PORT, 4273);
const host = process.env.PREVIEW_HOST ?? "127.0.0.1";
const baseUrl = `http://${host}:${port}`;
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";

const runBlocking = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
};

const waitForServer = async (url, timeoutMs = 30_000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Keep retrying until timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Preview server did not become reachable at ${url}`);
};

const run = async () => {
  runBlocking(npmCommand, ["run", "build"]);

  const preview = spawn(
    npmCommand,
    [
      "run",
      "preview",
      "--",
      "--host",
      host,
      "--port",
      String(port),
      "--strictPort",
    ],
    {
      stdio: "inherit",
      env: process.env,
    },
  );

  try {
    await waitForServer(baseUrl);
    runBlocking(npmCommand, ["run", "export:frames"], {
      env: {
        ...process.env,
        BASE_URL: baseUrl,
        ENCODE: process.env.ENCODE ?? "1",
      },
    });
  } finally {
    preview.kill("SIGTERM");
  }
};

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
