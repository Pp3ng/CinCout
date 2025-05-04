import { defineConfig } from "vite";
import { resolve } from "path";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Base public path
  base: "./",

  // Add React plugin
  plugins: [react()],

  // Build options
  build: {
    outDir: "dist",
    emptyOutDir: true,
    chunkSizeWarningLimit: 800, // Increase chunk size warning limit
    // Output files
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
      output: {
        // chunk files
        manualChunks: {
          vendor: [
            "codemirror",
            "@xterm/xterm",
            "@xterm/addon-fit",
            "html2canvas",
            "react",
            "react-dom",
          ],
          editor: ["./ts/editor.ts"],
          handlers: ["./ts/handlers.ts", "./ts/websocket.ts"],
          ui: ["./ts/layout.ts", "./ts/shortcuts.ts"],
          react: ["./ts/react-integration.tsx", "./ts/components/Header.tsx"],
        },
      },
    },
  },
  // Resolve assets from node_modules
  resolve: {
    alias: {
      "@": resolve(__dirname, "./"),
    },
  },
});
