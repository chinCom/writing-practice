'use client';
import type { ReactNode } from 'react';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { makeTheme } from '@/theme/theme';
import NetworkNotice from './NetworkNotice';
const theme = makeTheme();

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <AppRouterCacheProvider>
      <ThemeProvider theme={theme} defaultMode="system" disableTransitionOnChange>
        <CssBaseline />
        {children}
        <NetworkNotice />
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
