import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@database": resolve(__dirname, "src/database/index.ts"),
      "@controllers": resolve(__dirname, "src/controllers"),
      "@repositories": resolve(__dirname, "src/repositories")
    }
  },
  test: {
    pool: "threads",
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
    include: ["tests/**/*.test.ts"]
  }
});
