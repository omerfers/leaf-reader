import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Leaf — a quieter reading app",
    short_name: "Leaf",
    description: "Your own EPUB and PDF books, with translation on the page.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f2ece0",
    theme_color: "#8a5a34",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-1024.png", sizes: "1024x1024", type: "image/png", purpose: "any" },
    ],
  };
}
