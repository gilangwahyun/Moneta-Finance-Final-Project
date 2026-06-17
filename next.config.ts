import type { NextConfig } from "next";

// ─── Next.js Config ───────────────────────────────────────
//
// PWA Notes:
//   This app uses a fully handcrafted service worker at /public/sw.js.
//   We do NOT use @ducanh2912/next-pwa or any Workbox-based plugin because
//   those tools auto-generate a /public/sw.js on every production build,
//   overwriting our custom SW and breaking PWA installability on Vercel.
//
//   The manifest.json is linked via Next.js metadata API in src/app/layout.tsx.
//   The service worker is registered manually via src/lib/sw/register.ts.

const nextConfig: NextConfig = {
  // Silence Turbopack vs Webpack conflicts (safe to keep)
  turbopack: {},
};

export default nextConfig;
