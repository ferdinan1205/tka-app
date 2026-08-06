import type { NextConfig } from "next"

const nextConfig: NextConfig = {

  output: 'standalone',

  allowedDevOrigins: [
    "192.168.18.17",
  ],

  images: {

    remotePatterns: [
      {
        protocol: "https",
        hostname:
          "mrqqxaqvinvehfbpyoel.supabase.co",
      },
    ],

  },

}

export default nextConfig