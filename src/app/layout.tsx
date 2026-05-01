import type { Metadata } from "next";
import Script from "next/script";

import "@/app/globals.css";
import { ThemeScopeController } from "@/components/theme-scope-controller";
import { SupportReplyNotifier } from "@/features/support/components/support-reply-notifier";

export const metadata: Metadata = {
  title: {
    default: "NerdLingoLab",
    template: "%s | NerdLingoLab"
  },
  description: "E-commerce NerdLingoLab com programa de fidelidade, cupons e checkout seguro.",
  applicationName: "NerdLingoLab",
  icons: {
    icon: "/brand-assets/FAVICON_NERDLINGOLAB.webp"
  },
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000")
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>): React.ReactElement {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <Script src="/theme-init.js" strategy="beforeInteractive" />
      </head>
      <body>
        <ThemeScopeController />
        {children}
        <SupportReplyNotifier />
      </body>
    </html>
  );
}
