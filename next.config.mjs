import { networkInterfaces } from "node:os";

const devOrigins = [
  ...Object.values(networkInterfaces())
    .flat()
    .filter(Boolean)
    .map((address) => address.address),
  ...(process.env.DEV_ALLOWED_ORIGINS || "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean),
  ...(process.env.APP_ORIGIN || "").split(",").flatMap((origin) => {
    try {
      return [new URL(origin.trim()).hostname];
    } catch {
      return [];
    }
  }),
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [...new Set(devOrigins)],
  turbopack: { root: process.cwd() },
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "flagcdn.com", pathname: "/*.svg", search: "" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};
export default nextConfig;
