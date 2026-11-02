import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // The Android app is built as a static export and bundled into the APK.
  output: process.env.LEAF_APP === "1" ? "export" : undefined,
  // the app's WebView resolves "read/" to read/index.html on reload
  trailingSlash: process.env.LEAF_APP === "1",
  // Old links to /read/<id> keep working on the website.
  redirects: async () =>
    process.env.LEAF_APP === "1"
      ? []
      : [{ source: "/read/:id", destination: "/read?id=:id", permanent: true }],
  // The static app build cannot use cache components; the website keeps them.
  cacheComponents: process.env.LEAF_APP !== "1",
  partialPrefetching: process.env.LEAF_APP !== "1",
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
