'use client';

import { useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import { ThemeProvider } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Box from '@mui/material/Box';
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
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import { signOut } from '@/app/login/actions';
import { makeTheme } from '@/theme/theme';
import LogoMark from '@/components/ui/icons/LogoMark';
import BoardIcon from '@/components/ui/icons/BoardIcon';
import NavigationButton from '@/components/shared/NavigationButton';
import ActionButton from '@/components/shared/ActionButton';

// A separate CSS variable prefix keeps page themes from changing navigation styles.
const navigationTheme = makeTheme('navigation');
const items = [
  { id: 'today', href: '/today', icon: 'home' },
  { id: 'path', href: '/path', icon: 'map' },
  { id: 'write', href: '/write/weekend', icon: 'pencil' },
  { id: 'practice', href: '/practice', icon: 'practice' },
  { id: 'progress', href: '/progress', icon: 'bars' },
  { id: 'portfolio', href: '/portfolio', icon: 'document' },
  { id: 'settings', href: '/settings', icon: 'settings' },
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

export function Logo({ label }: { label?: string }) {
  const t = useTranslations('app');
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.25 }}>
      <LogoMark sx={{ fontSize: 34 }} />
      <Typography
        variant="subtitle1"
        component="p"
        sx={{
          fontWeight: 700,
          fontSize: '1.125rem',
          letterSpacing: '-0.01em',
          whiteSpace: 'nowrap',
        }}
      >
        {label ?? t('name')}
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
    <Box component="footer" sx={{ mt: 'auto', px: 0.5, pb: 0.5 }}>
      <Divider sx={{ mb: 2 }} />
      {signOutFailed ? (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {t('signOutError')}
        </Alert>
      ) : null}
      {/* Account identity is temporarily hidden; keep sign-in and sign-out available. */}
      {signedIn ? (
        <ActionButton
          fullWidth
          tone="secondary"
          startIcon={<LogoutOutlined />}
          disabled={signingOut}
          onClick={handleSignOut}
          sx={{ justifyContent: 'center' }}
        >
          {t('signOut')}
        </ActionButton>
      ) : (
        <NavigationButton
          fullWidth
          tone="secondary"
          startIcon={<LoginOutlined />}
          href="/login"
          sx={{ justifyContent: 'center' }}
        >
          {t('signIn')}
        </NavigationButton>
      )}
    </Box>
  );
}

function NavigationLinks({ pathname, onNavigate }: { pathname: string; onNavigate: () => void }) {
  const t = useTranslations('app');
  const active = activeItem(pathname);

  return (
    <List component="nav" aria-label={t('nav')} sx={{ py: 0.5 }}>
      {items.map((item) => (
        <ListItemButton
          key={item.id}
          component={NextLink}
          href={destination(item, pathname)}
          selected={active === item.id}
          aria-current={active === item.id ? 'page' : undefined}
          onClick={onNavigate}
          sx={{ px: 1.75, mb: 1.5 }}
        >
          <ListItemIcon>
            <BoardIcon name={item.icon} sx={{ fontSize: 23 }} />
          </ListItemIcon>
          <ListItemText primary={t(item.id)} />
        </ListItemButton>
      ))}
    </List>
  );
}

export default function AppNavigation({
  signedIn,
  collapsed,
  onCollapsedChange,
}: {
  signedIn: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}) {
  const pathname = usePathname();
  const t = useTranslations('app');
  const [menuOpen, setMenuOpen] = useState(false);
  const active = activeItem(pathname);
  const reopenButton = useRef<HTMLButtonElement>(null);
  const collapseButton = useRef<HTMLButtonElement>(null);

  function toggleSidebar() {
    onCollapsedChange(!collapsed);
    requestAnimationFrame(() => {
      (collapsed ? collapseButton : reopenButton).current?.focus();
    });
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <ThemeProvider theme={navigationTheme}>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: collapsed ? 'none' : 'block' },
          width: (theme) => theme.layout.navWidth,
        }}
        slotProps={{
          paper: {
            component: 'aside',
            id: 'desktop-navigation',
            'aria-label': t('nav'),
            sx: {
              width: (theme) => theme.layout.navWidth - 16,
              boxSizing: 'border-box',
              bgcolor: 'background.paper',
              insetBlock: '20px',
              insetInlineStart: '20px',
              height: 'auto',
              border: 1,
              borderRadius: 3,
              backgroundImage:
                'linear-gradient(135deg, var(--navigation-palette-background-paper), color-mix(in srgb, var(--navigation-palette-background-paper) 92%, var(--navigation-palette-tonal-primary)))',
              borderInlineEnd: 1,
              borderColor: 'divider',
              p: 1.5,
            },
          },
        }}
      >
        <Box component="header" sx={{ pt: 0.75, pb: 3.5, px: 0.75 }}>
          <Logo />
          <IconButton
            ref={collapseButton}
            aria-label={t('close')}
            aria-expanded={!collapsed}
            aria-controls="desktop-navigation"
            onClick={toggleSidebar}
            sx={{ mt: 1 }}
          >
            <CloseOutlined />
          </IconButton>
        </Box>
        <NavigationLinks pathname={pathname} onNavigate={closeMenu} />
        <AccountFooter signedIn={signedIn} />
      </Drawer>
      {collapsed ? (
        <IconButton
          ref={reopenButton}
          aria-label={t('menu')}
          aria-expanded={false}
          aria-controls="desktop-navigation"
          onClick={toggleSidebar}
          sx={{
            display: { xs: 'none', md: 'inline-flex' },
            position: 'fixed',
            insetBlockStart: 8,
            insetInlineStart: 8,
            zIndex: (theme) => theme.zIndex.appBar,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <MenuOutlined />
        </IconButton>
      ) : null}
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
        slotProps={{ paper: { sx: { width: (theme) => theme.layout.navWidth, p: 2.5 } } }}
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
          bgcolor: 'background.paper',
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
              icon={<BoardIcon name={item.icon} />}
              component={NextLink}
              href={destination(item, pathname)}
              aria-current={active === item.id ? 'page' : undefined}
            />
          ))}
      </BottomNavigation>
    </ThemeProvider>
  );
}
