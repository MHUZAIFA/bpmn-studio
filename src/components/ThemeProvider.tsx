'use client';

import { useEffect } from 'react';
import { usePreferencesStore, THEMES } from '@/stores/preferencesStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = usePreferencesStore();

  useEffect(() => {
    const config = THEMES.find((t) => t.id === theme) ?? THEMES[0];
    const root = document.documentElement;
    for (const [key, value] of Object.entries(config.colors)) {
      root.style.setProperty(`--${camelToDash(key)}`, value);
    }
  }, [theme]);

  return <>{children}</>;
}

function camelToDash(str: string): string {
  return str.replace(/([A-Z])/g, '-$1').toLowerCase();
}
