'use client';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import NextLink from 'next/link';
import { useTranslations } from 'next-intl';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Link from '@mui/material/Link';
import Alert from '@mui/material/Alert';
import HomeOutlined from '@mui/icons-material/HomeOutlined';
import MapOutlined from '@mui/icons-material/MapOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import FitnessCenterOutlined from '@mui/icons-material/FitnessCenterOutlined';
import BarChartOutlined from '@mui/icons-material/BarChartOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
const items = [
  { id: 'today', href: '/today', icon: HomeOutlined },
  { id: 'path', href: '/path', icon: MapOutlined },
  { id: 'write', href: '/write/weekend', icon: EditOutlined },
  { id: 'practice', href: '/practice', icon: FitnessCenterOutlined },
  { id: 'progress', href: '/progress', icon: BarChartOutlined },
  { id: 'portfolio', href: '/portfolio', icon: DescriptionOutlined },
  { id: 'settings', href: '/settings', icon: SettingsOutlined },
] as const;
function Logo() {
  const t = useTranslations('app');
  return (
    <Stack direction="row" sx={{ alignItems: 'center', gap: 1.5 }}>
      <Box sx={{ borderBottom: 3, borderColor: 'highlighter.main', display: 'flex', pb: 0.25 }}>
        <DescriptionOutlined />
      </Box>
      <Typography variant="subtitle1" component="p">
        {t('name')}
      </Typography>
    </Stack>
  );
}
export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const t = useTranslations('app');
  const [menu, setMenu] = useState(false);
  const preview = pathname.startsWith('/dev/preview');
  const active =
    pathname.includes('write') || pathname.includes('feedback')
      ? 'write'
      : pathname.includes('portfolio') || pathname.includes('revision')
        ? 'portfolio'
        : pathname.includes('settings')
          ? 'settings'
          : pathname.includes('practice')
            ? 'practice'
            : pathname.includes('progress')
              ? 'progress'
              : pathname.includes('placement') ||
                  pathname.includes('lesson') ||
                  pathname.includes('/path')
                ? 'path'
                : preview
                  ? 'today'
                  : pathname.split('/')[1];
  function destination(item: (typeof items)[number]) {
    if (preview && item.id === 'path') return '/dev/preview/path';
    if (preview && item.id === 'today') return '/dev/preview/today';
    if (preview && item.id === 'practice') return '/dev/preview/practice-page';
    if (preview && item.id === 'progress') return '/dev/preview/progress';
    if (preview && item.id === 'portfolio') return '/dev/preview/portfolio';
    if (preview && item.id === 'write')
      return pathname.includes('live-write') || pathname.includes('feedback')
        ? '/dev/preview/live-write'
        : '/dev/preview/write';
    return item.href;
  }
  const navigation = (
    <List component="nav" aria-label={t('nav')}>
      {items.map((item) => (
        <ListItemButton
          key={item.id}
          component={NextLink}
          href={destination(item)}
          selected={active === item.id}
          aria-current={active === item.id ? 'page' : undefined}
          onClick={() => setMenu(false)}
        >
          <ListItemIcon>
            <item.icon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t(item.id)} />
        </ListItemButton>
      ))}
    </List>
  );
  return (
    <Box sx={{ minHeight: '100dvh' }}>
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
      <Drawer
        variant="permanent"
        sx={{ display: { xs: 'none', md: 'block' }, width: (theme) => theme.layout.navWidth }}
        slotProps={{
          paper: {
            sx: {
              width: (theme) => theme.layout.navWidth,
              boxSizing: 'border-box',
              bgcolor: 'background.default',
              p: 2,
            },
          },
        }}
      >
        <Box sx={{ pt: 1, pb: 4, px: 1 }}>
          <Logo />
        </Box>
        {navigation}
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
          <IconButton aria-label={t('menu')} onClick={() => setMenu(true)}>
            <MenuOutlined />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Drawer
        anchor="left"
        open={menu}
        onClose={() => setMenu(false)}
        slotProps={{ paper: { sx: { width: (theme) => theme.layout.navWidth, p: 2 } } }}
      >
        <IconButton
          aria-label={t('close')}
          onClick={() => setMenu(false)}
          sx={{ alignSelf: 'flex-end' }}
        >
          <CloseOutlined />
        </IconButton>
        <Logo />
        {navigation}
      </Drawer>
      <Box
        component="main"
        id="main"
        tabIndex={-1}
        sx={(theme) => ({
          marginInlineStart: { md: theme.layout.navWidth + 'px' },
          paddingBlockStart: {
            xs: 'calc(' + theme.layout.topBarHeight + 'px + ' + theme.spacing(3) + ')',
            md: theme.spacing(4),
          },
          paddingBlockEnd: {
            xs: 'calc(' + theme.layout.bottomNavHeight + 'px + ' + theme.spacing(3) + ')',
            md: theme.spacing(4),
          },
          px: { xs: 2, md: 3 },
          minHeight: '100dvh',
        })}
      >
        {preview ? (
          <Alert severity="info" sx={{ mb: 3 }}>
            {t('preview')}
          </Alert>
        ) : null}
        {children}
      </Box>
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
              href={destination(item)}
              aria-current={active === item.id ? 'page' : undefined}
            />
          ))}
      </BottomNavigation>
    </Box>
  );
}
