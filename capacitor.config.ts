import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.simos.scamsim",
  appName: "SimOS",
  webDir: "out",
  bundledWebRuntime: false,
  android: {
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#000000",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
      overlaysWebView: false,
    },
  },
};

export default config;
