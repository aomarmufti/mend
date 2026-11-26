import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Self-contained server output, so the app runs from a plain Docker image on any host.
  output: "standalone",
  async headers() {
    // The service worker must never be cached, or a bad one could stick.
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  async redirects() {
    return [
      // Library and Coach tabs were merged into Plan.
      { source: "/library", destination: "/plan", permanent: false },
      { source: "/library/:slug", destination: "/exercise/:slug", permanent: false },
      { source: "/plan/:slug", destination: "/exercise/:slug", permanent: false },
      // Coach is a full-screen mode entered from an exercise; bare /coach has
      // nothing to coach.
      {
        source: "/coach",
        missing: [{ type: "query", key: "exercise" }],
        destination: "/plan",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
