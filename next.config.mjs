/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true,
  },
  async headers() {
    return [
      {
        // The film never changes once generated. Without this the preload and
        // the <video> element each fetch it, which is a second 1.7MB download
        // on a phone for no reason.
        source: "/clips/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
