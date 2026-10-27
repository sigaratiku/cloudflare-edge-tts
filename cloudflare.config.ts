import { defineConfig } from "cf/config";

export default defineConfig({
  accountId: "89979f0e2a2d639679dc6e4154155521",
  worker: {
    name: "edge-tts-api",
    compatibilityDate: "2026-04-10",
    entrypoint: "src/index.ts",
    workersDev: true,
  },
});
