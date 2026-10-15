import type { MetadataRoute } from "next";

// Di luar app/[lang]: satu manifest untuk kedua bahasa (proxy tidak me-rewrite path ini).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Commission Tracker",
    short_name: "Commissions",
    description: "Track open commissions: deadlines, progress, payments, and income.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#171717",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
