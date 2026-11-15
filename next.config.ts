import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    const privateHeaders = [
      { key: "Cache-Control", value: "private, no-store, max-age=0" },
      { key: "Referrer-Policy", value: "no-referrer" },
      { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive, nosnippet, noimageindex" },
      { key: "X-Content-Type-Options", value: "nosniff" },
    ];
    return [
      { source: "/entradas/:path*", headers: privateHeaders },
      { source: "/eventos/:id/registro", headers: privateHeaders },
    ];
  },
  turbopack: {
    rules: { "*.css": { loaders: ["@tailwindcss/turbopack"], as: "*.css" } },
  },
};

export default nextConfig;
