'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v16-appRouter';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { makeTheme } from '@/theme/theme';
import NetworkNotice from './NetworkNotice';
const theme = makeTheme();
const todayTheme = makeTheme(true);

export default function Providers({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const today = pathname === '/today' || pathname.startsWith('/dev/preview/today');
  return (
    <AppRouterCacheProvider>
      <ThemeProvider
        theme={today ? todayTheme : theme}
        defaultMode="system"
        disableTransitionOnChange
      >
        <CssBaseline />
        {children}
        <NetworkNotice />
      </ThemeProvider>
    </AppRouterCacheProvider>
  );
}
