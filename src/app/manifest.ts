import type { MetadataRoute } from "next";

/**
 * Makes Reknit installable to the home screen. The icon is the chosen App
 * Store mark (woven goniometer on the night green), in the sizes browsers ask
 * for. iOS takes its home-screen icon from `apple-icon.png` beside this file.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reknit",
    short_name: "Reknit",
    description: "Camera-coached rehab.",
    start_url: "/",
    display: "standalone",
    background_color: "#0E2A26",
    theme_color: "#0E2A26",
    icons: [
      { src: "/brand/appstore/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/appstore/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
