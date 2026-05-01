"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

type ThemeMode = "dark" | "light";

const adminThemeStorageKey = "nerdlingolab-admin-theme";
const legacyThemeStorageKey = "nerdlingolab-theme";

export function ThemeScopeController(): null {
  const pathname = usePathname();

  useEffect(() => {
    const isAdminRoute = pathname?.startsWith("/admin") ?? false;
    const root = document.documentElement;
    const storedAdminTheme = window.localStorage.getItem(adminThemeStorageKey);
    const storedLegacyTheme = window.localStorage.getItem(legacyThemeStorageKey);
    const adminTheme: ThemeMode = storedAdminTheme === "dark" || storedLegacyTheme === "dark" ? "dark" : "light";
    const theme: ThemeMode = isAdminRoute ? adminTheme : "light";

    if (isAdminRoute && !storedAdminTheme && storedLegacyTheme) {
      window.localStorage.setItem(adminThemeStorageKey, adminTheme);
    }

    window.localStorage.removeItem(legacyThemeStorageKey);
    root.classList.toggle("light", theme === "light");
    root.classList.toggle("dark", isAdminRoute && theme === "dark");
    root.dataset.theme = theme;
    root.dataset.themeScope = isAdminRoute ? "admin" : "shop";
    root.style.colorScheme = isAdminRoute && theme === "dark" ? "dark" : "light";
  }, [pathname]);

  return null;
}
