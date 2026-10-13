'use client';
import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import rtlPlugin from '@mui/stylis-plugin-rtl';
import { prefixer } from 'stylis';
import { makeTheme } from '@/theme/theme';
export default function Providers({
  children,
  direction,
}: {
  children: ReactNode;
  direction: 'ltr' | 'rtl';
}) {
  const theme = useMemo(() => makeTheme(direction), [direction]);
  return (
    <AppRouterCacheProvider
      options={{
        key: direction === 'rtl' ? 'muirtl' : 'mui',
        stylisPlugins: direction === 'rtl' ? [prefixer, rtlPlugin] : [prefixer],
      }}
    >
      <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
