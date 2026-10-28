// SPDX-License-Identifier: AGPL-3.0-only

import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  publicDir: "public",
  server: { host: "127.0.0.1", port: 5187, fs: { allow: [fileURLToPath(new URL("..", import.meta.url))] } },
  preview: { host: "127.0.0.1", port: 5187 },
  build: { outDir: "dist", emptyOutDir: true, sourcemap: false },
});
