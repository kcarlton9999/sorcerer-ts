import { defineConfig } from "vite";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: "index.html",
        colorValueChart: "color-value-chart.html",
        combatTest: "combat-test.html",
      },
    },
  },
});
