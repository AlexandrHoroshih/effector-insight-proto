import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react({
      babel: {
        presets: ["patronum/babel-preset"],
        plugins: [["effector/babel-plugin", { addLoc: true, addNames: true }]],
      },
    }),
  ],
});
