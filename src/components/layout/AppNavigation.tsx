'use client';

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { ThemeProvider } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FitnessCenterOutlined from '@mui/icons-material/FitnessCenterOutlined';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import MapOutlined from '@mui/icons-material/MapOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { signOut } from '@/app/login/actions';
import { makeTheme } from '@/theme/theme';

// A separate CSS variable prefix keeps page themes from changing navigation styles.
const navigationTheme = makeTheme(true, 'navigation');
const items = [
  { id: 'today', href: '/today', icon: HomeOutlined },
  { id: 'path', href: '/path', icon: MapOutlined },
  { id: 'write', href: '/write/weekend', icon: EditOutlined },
  { id: 'practice', href: '/practice', icon: FitnessCenterOutlined },
  { id: 'progress', href: '/progress', icon: BarChartOutlined },
  { id: 'portfolio', href: '/portfolio', icon: DescriptionOutlined },
  { id: 'settings', href: '/settings', icon: SettingsOutlined },
] as const;

function activeItem(pathname: string) {
  if (pathname.includes('write') || pathname.includes('feedback')) return 'write';
  if (pathname.includes('portfolio') || pathname.includes('revision')) return 'portfolio';
  if (pathname.includes('settings')) return 'settings';
  if (pathname.includes('practice')) return 'practice';
  if (pathname.includes('progress')) return 'progress';
  if (pathname.includes('placement') || pathname.includes('lesson') || pathname.includes('/path')) {
    return 'path';
  }
  if (pathname.startsWith('/dev/preview')) return 'today';
  return pathname.split('/')[1];
}

function destination(item: (typeof items)[number], pathname: string) {
  if (!pathname.startsWith('/dev/preview')) return item.href;
  if (item.id === 'path') return '/dev/preview/path';
  if (item.id === 'today') return '/dev/preview/today';
  if (item.id === 'practice') return '/dev/preview/practice-page';
  if (item.id === 'progress') return '/dev/preview/progress';
  if (item.id === 'portfolio') return '/dev/preview/portfolio';
  if (item.id === 'write') {
    return pathname.includes('live-write') || pathname.includes('feedback')
      ? '/dev/preview/live-write'
      : '/dev/preview/write';
  }
  return item.href;
}

export function Logo() {
  const t = useTranslations('app');
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ borderBottom: 3, borderColor: 'highlighter.main', display: 'flex', pb: 0.25 }}>
        <DescriptionOutlined />
      </Box>
      <Typography variant="subtitle1" component="p" sx={{ fontWeight: 700 }}>
        {t('name')}
      </Typography>
    </Stack>
  );
}

function AccountFooter({ signedIn }: { signedIn: boolean }) {
  const router = useRouter();
  const t = useTranslations('app');

  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    setSignOutFailed(false);
    try {
      const result = await signOut();
      if (!result.ok) {
        setSignOutFailed(true);
        return;
      }
      router.replace('/login');
      router.refresh();
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Box component="footer" sx={{ mt: 'auto', px: 1, pb: 0.25 }}>
      <Divider sx={{ mb: 2.5 }} />
      {signOutFailed ? <Alert severity="error">{t('signOutError')}</Alert> : null}
      {/* Account identity is temporarily hidden; keep sign-in and sign-out available. */}
      {signedIn ? (
        <Button fullWidth variant="outlined" disabled={signingOut} onClick={handleSignOut}>
          {t('signOut')}
        </Button>
      ) : (
        <Button fullWidth variant="outlined" component={NextLink} href="/login">
          {t('signIn')}
        </Button>
      )}
    </Box>
  );
}

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const t = useTranslations('app');
  const active = activeItem(pathname);

  return (
    <List component="nav" aria-label={t('nav')}>
      {items.map((item) => (
        <ListItemButton
          key={item.id}
          component={NextLink}
          href={destination(item, pathname)}
          selected={active === item.id}
          aria-current={active === item.id ? 'page' : undefined}
          onClick={onNavigate}
        >
          <ListItemIcon>
            <item.icon />
          </ListItemIcon>
          <ListItemText primary={t(item.id)} />
        </ListItemButton>
      ))}
    </List>
  );
}

export default function AppNavigation({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const t = useTranslations('app');
  const [menuOpen, setMenuOpen] = useState(false);
  const active = activeItem(pathname);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <ThemeProvider theme={navigationTheme}>
      <Drawer
        variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, width: (theme) => theme.layout.navWidth }}
        slotProps={{
          paper: {
            component: 'aside',
            'aria-label': t('nav'),
            sx: {
              width: (theme) => theme.layout.navWidth,
              boxSizing: 'border-box',
              bgcolor: 'background.default',
              p: 2,
            },
          },
        }}
      >
        <Box component="header" sx={{ pt: 1, pb: 3.5, px: 1 }}>
          <Logo />
        </Box>
        <NavigationLinks pathname={pathname} onNavigate={closeMenu} />
        <AccountFooter signedIn={signedIn} />
      </Drawer>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          display: { md: 'none' },
          bgcolor: 'background.paper',
          color: 'text.primary',
          borderBottom: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar
          sx={{ minHeight: (theme) => theme.layout.topBarHeight, justifyContent: 'space-between' }}
        >
          <Logo />
          <IconButton aria-label={t('menu')} onClick={() => setMenuOpen(true)}>
            <MenuOutlined />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="left"
        open={menuOpen}
        onClose={closeMenu}
        slotProps={{ paper: { sx: { width: (theme) => theme.layout.navWidth, p: 2 } } }}
      >
        <IconButton aria-label={t('close')} onClick={closeMenu} sx={{ alignSelf: 'flex-end' }}>
          <CloseOutlined />
        </IconButton>
        <Logo />
        <NavigationLinks pathname={pathname} onNavigate={closeMenu} />
        <AccountFooter signedIn={signedIn} />
      </Drawer>
      <BottomNavigation
        component="nav"
        aria-label={t('nav')}
        showLabels
        value={active}
        sx={{
          display: { md: 'none' },
          position: 'fixed',
          insetBlockEnd: 0,
          insetInline: 0,
          zIndex: (theme) => theme.zIndex.appBar,
          borderTop: 1,
          borderColor: 'divider',
          height: (theme) => theme.layout.bottomNavHeight,
          pb: 'env(safe-area-inset-bottom)',
        }}
      >
        {items
          .filter((item) => ['today', 'write', 'practice', 'progress'].includes(item.id))
          .map((item) => (
            <BottomNavigationAction
              key={item.id}
              value={item.id}
              label={t(item.id === 'write' ? 'writeShort' : item.id)}
              icon={<item.icon />}
              component={NextLink}
              href={destination(item, pathname)}
              aria-current={active === item.id ? 'page' : undefined}
            />
          ))}
      </BottomNavigation>
    </ThemeProvider>
  );
}
