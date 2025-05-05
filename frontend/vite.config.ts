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
          editor: ["./src/editor.ts"],
          handlers: ["./src/handlers.ts", "./src/websocket.ts"],
          ui: ["./src/layout.ts"],
          react: ["./src/react-integration.tsx", "./src/components/Header.tsx"],
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
