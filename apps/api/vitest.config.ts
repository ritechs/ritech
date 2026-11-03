import swc from "unplugin-swc";
import { existsSync } from "node:fs";
import { defineConfig } from "vitest/config";

// TEST_DATABASE_URL can live in the repository root .env.
if (existsSync("../../.env")) process.loadEnvFile("../../.env");

export default defineConfig({
  plugins: [swc.vite({ module: { type: "es6" }, jsc: { parser: { syntax: "typescript", decorators: true }, transform: { legacyDecorator: true, decoratorMetadata: true }, target: "es2022" } })],
  test: {
    include: ["test/**/*.test.ts"],
    globalSetup: ["test/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: "forks",
  },
});
