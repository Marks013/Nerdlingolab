"use client";

import { MonitorCog } from "lucide-react";

import { Button } from "@/components/ui/button";

type ThemeMode = "dark" | "light";

const adminThemeStorageKey = "nerdlingolab-admin-theme";
const legacyThemeStorageKey = "nerdlingolab-theme";

function applyTheme(themeMode: ThemeMode): void {
  const root = document.documentElement;

  root.classList.toggle("light", themeMode === "light");
  root.classList.toggle("dark", themeMode === "dark");
  root.dataset.theme = themeMode;
  root.dataset.themeScope = "admin";
  root.style.colorScheme = themeMode;
  window.localStorage.setItem(adminThemeStorageKey, themeMode);
  window.localStorage.removeItem(legacyThemeStorageKey);
}

interface ThemeToggleProps {
  compact?: boolean;
}

export function ThemeToggle({ compact = false }: ThemeToggleProps): React.ReactElement {
  function toggleTheme(): void {
    const currentTheme = document.documentElement.classList.contains("light") ? "light" : "dark";
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    applyTheme(nextTheme);
  }

  return (
    <Button
      aria-label="Alternar tema"
      className={compact ? "shrink-0" : undefined}
      onClick={toggleTheme}
      size={compact ? "icon" : "sm"}
      title="Alternar tema"
      type="button"
      variant="ghost"
    >
      {compact ? (
        <MonitorCog className="h-4 w-4" />
      ) : (
        <>
          <MonitorCog className="mr-2 h-4 w-4" />
          Tema
        </>
      )}
    </Button>
  );
}
