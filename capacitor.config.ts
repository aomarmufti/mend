import type { CapacitorConfig } from "@capacitor/cli";

/**
 * The iPhone and iPad app is a native shell around the web app.
 *
 * For now the shell loads the deployed site (`server.url`), so the app updates
 * whenever the site does and the camera coach runs on the same code as the
 * browser. That is right for testing and for a demo. Apple's reviewers tend to
 * reject an app that is only a website, so a store submission should bundle the
 * web app and add native features first.
 *
 * Point it somewhere else with REKNIT_APP_URL when running `npx cap sync`.
 */
const config: CapacitorConfig = {
  appId: "uk.co.reknit.app",
  appName: "Reknit",
  // Required by Capacitor. Only a small "connecting" page lives here, shown if the site cannot be reached.
  webDir: "native/www",
  server: {
    url: process.env.REKNIT_APP_URL ?? "https://reknit.co.uk",
    cleartext: false,
  },
  ios: {
    // Draw under the notch and home bar; the app already pads for safe areas.
    contentInset: "never",
    backgroundColor: "#0E2A26",
  },
};

export default config;
