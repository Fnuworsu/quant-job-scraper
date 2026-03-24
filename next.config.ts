import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/quant-job-scraper',
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
