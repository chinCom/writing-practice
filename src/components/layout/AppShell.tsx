'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import AppNavigation from './AppNavigation';
import BackdropRibbons from '@/components/ui/icons/BackdropRibbons';

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
        borderRadius: 1,
        boxShadow: 2,
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
  // Signed-out visitors on the landing page get the marketing layout; the page renders its own header, main and footer.
  const marketing = pathname === '/' && !signedIn;
  // Login is a standalone entry screen, so it keeps the page background without the app navigation.
  const standalone = pathname === '/login';
  if (marketing)
    return (
      <>
        <SkipLink />
        {children}
      </>
    );
  return (
    <Box
      sx={{
        minHeight: '100dvh',
        backgroundColor: 'background.default',
        position: 'relative',
        isolation: 'isolate',
      }}
    >
      <BackdropRibbons expansive={standalone} />
      <SkipLink />
      {standalone ? null : <AppNavigation signedIn={signedIn} />}
      <Box
        component="main"
        id="main"
        tabIndex={-1}
        sx={(theme) => ({
          marginInlineStart: standalone ? 0 : { md: theme.layout.navWidth + 'px' },
          display: standalone ? 'flex' : 'block',
          flexDirection: 'column',
          justifyContent: 'center',
          paddingBlockStart: standalone
            ? 1.5
            : {
                xs: 'calc(' + theme.layout.topBarHeight + 'px + ' + theme.spacing(3) + ')',
                md: theme.spacing(6.5),
              },
          paddingBlockEnd: standalone
            ? 1.5
            : {
                xs: 'calc(' + theme.layout.bottomNavHeight + 'px + ' + theme.spacing(4) + ')',
                md: theme.spacing(6),
              },
          paddingInline: { xs: 2, sm: 3, md: 5 },
          minHeight: '100dvh',
        })}
      >
        <Box
          sx={{
            maxInlineSize: (theme) => theme.layout.contentMax + 'px',
            marginInline: 'auto',
            position: 'relative',
          }}
        >
          {children}
          {preview ? (
            <Alert
              severity="info"
              icon={false}
              sx={{
                mt: 3,
                py: 0.75,
                bgcolor: 'background.paper',
                border: 1,
                borderColor: 'divider',
                color: 'text.secondary',
                typography: 'caption',
              }}
            >
              {t('preview')}
            </Alert>
          ) : null}
        </Box>
      </Box>
    </Box>
  );
}
