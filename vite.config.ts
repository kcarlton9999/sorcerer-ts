import { configDefaults, defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
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
