import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["duckdb", "duckdb-async", "postgres"],
};

export default nextConfig;
