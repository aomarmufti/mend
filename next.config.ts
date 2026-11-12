import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
