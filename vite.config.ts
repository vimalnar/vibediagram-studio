import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) {
            return;
          }
          if (id.includes("@theatre")) {
            return "theatre-vendor";
          }
          if (
            id.includes("three") ||
            id.includes("@react-three") ||
            id.includes("@react-spring/three")
          ) {
            return "three-vendor";
          }
          if (id.includes("katex") || id.includes("react-katex")) {
            return "math-vendor";
          }
          if (id.includes("react") || id.includes("scheduler")) {
            return "react-vendor";
          }
          return "vendor";
        },
      },
    },
  },
});
