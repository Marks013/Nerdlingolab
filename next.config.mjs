import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: process.env.MINIO_USE_SSL === "true" ? "https" : "http",
        hostname: process.env.MINIO_ENDPOINT ?? "localhost",
        port: process.env.MINIO_PORT ?? "9000",
        pathname: `/${process.env.MINIO_BUCKET ?? "product-images"}/**`
      },
      {
        protocol: "https",
        hostname: "cdn.shopify.com",
        pathname: "/**"
      }
    ]
  },
  async redirects() {
    return [
      {
        source: "/admin",
        destination: "/admin/dashboard",
        permanent: false
      },
      {
        source: "/recompensas",
        destination: "/programa-de-fidelidade",
        permanent: true
      }
    ];
  }
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true
    }
  }
});
