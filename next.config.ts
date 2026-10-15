import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Indikator dev Next di kanan bawah agar tidak menutupi bagian akun di sidebar.
  devIndicators: { position: "bottom-right" },
  // "/" langsung ke dashboard (belum login → proxy mengarahkan ke /login).
  // Lewat config, bukan halaman redirect(): tidak ada yang perlu di-prerender.
  redirects: async () => [{ source: "/", destination: "/dashboard", permanent: false }],
  partialPrefetching: true,
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
