import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.absoluta.inventory.manager",
  appName: "Absoluta Inventory Manager",
  webDir: "dist",
  server: {
    androidScheme: "http",
  },
};

export default config;
