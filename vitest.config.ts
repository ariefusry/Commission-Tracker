import { defineConfig } from "vitest/config";

// Alias `@/` dari tsconfig.
export default defineConfig({ resolve: { tsconfigPaths: true } });
