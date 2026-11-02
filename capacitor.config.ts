import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // a new id, so it installs beside the old Expo app and nothing is removed
  appId: "com.omerfers.leafapp",
  appName: "Leaf",
  // the static export from `LEAF_APP=1 next build` is bundled into the app
  webDir: "out",
  android: {
    // https origin keeps IndexedDB and secure-context APIs working
    webContentsDebuggingEnabled: false,
  },
};

export default config;
