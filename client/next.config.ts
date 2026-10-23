import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async redirects() {
    const apk = "https://github.com/DenizK7/bulls-and-cows/releases/download/android-preview/DigitDuel.apk";
    return [
      { source: "/indir", destination: apk, permanent: false },
      { source: "/download", destination: apk, permanent: false },
    ];
  },
  images: {
    remotePatterns: [
      { hostname: "lh3.googleusercontent.com" },
    ],
  },
};

export default nextConfig;
