import type { NextConfig } from "next"

const nextConfig: NextConfig = {

  allowedDevOrigins: [
    "192.168.100.117",
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