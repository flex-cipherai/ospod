import { defineConfig } from "@trigger.dev/sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";

/**
 * Background jobs (episode processing) run on Trigger.dev, not Netlify.
 * Deploy with:  npx trigger.dev@latest deploy
 */
export default defineConfig({
  project: process.env.TRIGGER_PROJECT_REF ?? "proj_set_TRIGGER_PROJECT_REF",
  runtime: "node",
  dirs: ["./src/trigger"],
  maxDuration: 3600,
  retries: {
    enabledInDev: false,
    default: { maxAttempts: 2, minTimeoutInMs: 10_000, maxTimeoutInMs: 60_000, factor: 2 },
  },
  build: {
    extensions: [ffmpeg()],
  },
});
