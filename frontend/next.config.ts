import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Build a fully static site (frontend/out). In production FastAPI serves it,
  // so the UI and the API share one origin and one container.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
