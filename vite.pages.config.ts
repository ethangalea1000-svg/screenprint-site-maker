import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/screenprint-site-maker/",
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  build: {
    outDir: ".output/public",
    emptyOutDir: true,
    assetsDir: "assets",
  },
});
