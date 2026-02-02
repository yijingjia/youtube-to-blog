import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Disable server-side image optimization ONLY in development to avoid "resolved to private ip" errors
    // caused by local proxy tools (FakeIP).
    // In production, we want optimization enabled for better performance (WebP, resizing).
    unoptimized: process.env.NODE_ENV === 'development',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'i.ytimg.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yt3.ggpht.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'img.youtube.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
