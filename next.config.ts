import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Indikator dev Next di kanan bawah agar tidak menutupi bagian akun di sidebar.
  devIndicators: { position: "bottom-right" },
  partialPrefetching: true,
  // Header keamanan dasar (panduan PWA Next.js).
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
  experimental: {
    // Upload gambar WIP lewat Server Action: file ≤ 1 MB (dikompres di browser) + overhead multipart.
    serverActions: { bodySizeLimit: "1100kb" },
  },
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
