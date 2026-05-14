import { withSentryConfig } from "@sentry/nextjs";

import { getNextImageRemotePatterns } from "./config/remote-image-patterns.mjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  output: "standalone",
  images: {
    remotePatterns: getNextImageRemotePatterns()
  },
  async headers() {
    const cspReportOnly = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self' https://www.mercadopago.com.br https://*.mercadopago.com.br",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https://www.mercadopago.com.br https://*.mercadopago.com.br",
      "media-src 'self' blob: https:",
      "worker-src 'self' blob:",
      "report-uri /api/security/csp-report"
    ].join("; ");
    const securityHeaders = [
      { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
      { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
      { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-DNS-Prefetch-Control", value: "on" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" }
    ];

    return [
      {
        source: "/:path*",
        headers: securityHeaders
      },
      {
        source: "/brand-assets/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }
        ]
      },
      {
        source: "/admin/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "private, no-store" }
        ]
      },
      {
        source: "/conta/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "private, no-store" }
        ]
      },
      {
        source: "/checkout/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "private, no-store" }
        ]
      },
      {
        source: "/api/:path*",
        headers: [
          ...securityHeaders,
          { key: "Cache-Control", value: "private, no-store" }
        ]
      }
    ];
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
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  hideSourceMaps: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true
    }
  }
});
