import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El paquete de diseño se distribuye como TypeScript: Next lo transpila.
  transpilePackages: ["@letra-grande/design"],
};

export default nextConfig;
