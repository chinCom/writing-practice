'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import AppNavigation from './AppNavigation';

function SkipLink() {
  const t = useTranslations('app');
  return (
    <Link
      href="#main"
      sx={{
        position: 'fixed',
        insetBlockStart: (theme) => theme.spacing(1),
        insetInlineStart: (theme) => theme.spacing(1),
        zIndex: (theme) => theme.zIndex.modal + 1,
        p: 1.5,
        bgcolor: 'background.paper',
        transform: 'translateY(-200%)',
        '&:focus': { transform: 'none' },
      }}
    >
      {t('skip')}
    </Link>
  );
}

export default function AppShell({
  children,
  signedIn = false,
}: {
  children: ReactNode;
  signedIn?: boolean;
}) {
  const pathname = usePathname();
  const t = useTranslations('app');
  const preview = pathname.startsWith('/dev/preview');
  const today = pathname === '/today' || pathname.startsWith('/dev/preview/today');
  // Signed-out visitors on the landing page get the marketing layout; the page renders its own header, main and footer.
  const marketing = pathname === '/' && !signedIn;
  if (marketing)
    return (
      <>
        <SkipLink />
        {children}
      </>
    );
  return (
    <Box sx={{ minHeight: '100dvh' }}>
      <SkipLink />
      <AppNavigation signedIn={signedIn} />
      <Box
        component="main"
        id="main"
        tabIndex={-1}
        sx={(theme) => ({
          marginInlineStart: { md: theme.layout.navWidth + 'px' },
          paddingBlockStart: {
            xs: 'calc(' + theme.layout.topBarHeight + 'px + ' + theme.spacing(3) + ')',
            md: theme.spacing(today ? 2.5 : 4),
          },
          paddingBlockEnd: {
            xs: 'calc(' + theme.layout.bottomNavHeight + 'px + ' + theme.spacing(3) + ')',
            md: theme.spacing(4),
          },
          paddingInlineStart: { xs: 2, md: today ? 4.25 : 3 },
          paddingInlineEnd: { xs: 2, md: today ? 2.75 : 3 },
          minHeight: '100dvh',
        })}
      >
        {preview && !today ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('preview')}
          </Alert>
        ) : null}
        {children}
        {preview && today ? (
          <Alert severity="info" sx={{ mt: 3 }}>
            {t('preview')}
          </Alert>
        ) : null}
      </Box>
    </Box>
  );
}
