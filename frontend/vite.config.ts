import { defineConfig } from "vite";
import * as path from "path";

// Define __dirname equivalent for ESM
const __dirname = path.dirname(new URL(import.meta.url).pathname);

export default defineConfig(async () => {
  // Dynamically import tailwindcss plugin
  const tailwindcss = await import("@tailwindcss/vite").then(
    (m) => m.default || m
  );

  return {
    // Base public path
    base: "./",

    // Add Tailwind CSS plugin
    plugins: [tailwindcss()],

    // Build options
    build: {
      outDir: "dist",
      emptyOutDir: true,
      chunkSizeWarningLimit: 800, // Increase chunk size warning limit
      // Output files
      rollupOptions: {
        input: path.resolve(__dirname, "index.html"),
        output: {
          // chunk files
          manualChunks: {
            vendor: [
              "codemirror",
              "@xterm/xterm",
              "@xterm/addon-fit",
              "html2canvas",
            ],
          },
        },
      },
    },
    // Resolve assets from node_modules
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  };
});
