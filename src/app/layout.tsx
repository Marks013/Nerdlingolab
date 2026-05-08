import type { Metadata } from "next";
import Script from "next/script";

import "@/app/globals.css";
import { ThemeScopeController } from "@/components/theme-scope-controller";
import { SupportReplyNotifier } from "@/features/support/components/support-reply-notifier";

const adminThemeBootScript = `
(function () {
  try {
    var root = document.documentElement;
    var isAdminRoute = window.location.pathname.indexOf("/admin") === 0;
    var legacyThemeKey = "nerdlingolab-theme";
    var adminThemeKey = "nerdlingolab-admin-theme";
    var legacyTheme = window.localStorage.getItem(legacyThemeKey);
    var storedTheme = isAdminRoute ? window.localStorage.getItem(adminThemeKey) || legacyTheme : null;
    var isDark = isAdminRoute && storedTheme === "dark";

    root.classList.toggle("dark", isDark);
    root.classList.toggle("light", !isDark);
    root.dataset.theme = isDark ? "dark" : "light";
    root.dataset.themeScope = isAdminRoute ? "admin" : "shop";
    root.style.colorScheme = isDark ? "dark" : "light";

    if (isAdminRoute && legacyTheme && !window.localStorage.getItem(adminThemeKey)) {
      window.localStorage.setItem(adminThemeKey, isDark ? "dark" : "light");
    }

    window.localStorage.removeItem(legacyThemeKey);
  } catch (_error) {
    document.documentElement.classList.add("light");
    document.documentElement.style.colorScheme = "light";
  }
})();
`;

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
        <script dangerouslySetInnerHTML={{ __html: adminThemeBootScript }} />
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
