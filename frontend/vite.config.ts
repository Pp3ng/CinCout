import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  // Base public path when served
  base: "./",

  // Build options
  build: {
    outDir: "dist",
    emptyOutDir: true,
    // Output single file
    rollupOptions: {
      input: resolve(__dirname, "ts/index.ts"),
      output: {
        // Output files
        entryFileNames: "js/app.js",
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || "";
          if (name.endsWith(".css")) {
            return "css/app.css";
          }
          return "assets/[name].[ext]";
        },
        // Force all code into one file
        manualChunks: () => "app",
      },
    },
    // Disable source maps for production
    sourcemap: false,
  },
});
