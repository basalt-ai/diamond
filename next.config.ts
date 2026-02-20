import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "duckdb",
    "duckdb-async",
    "postgres",
    "pg",
    "pg-boss",
  ],
};

export default nextConfig;
