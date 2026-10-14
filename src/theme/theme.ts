import type { CSSObject } from '@mui/material/styles';
import { createTheme } from '@mui/material/styles';
import type { PaletteOptions } from '@mui/material/styles';
import { tokens } from './tokens';
declare module '@mui/material/styles' {
  interface Palette {
    highlighter: Palette['primary'];
    tonal: { primary: string; success: string };
    marks: {
      grammar: string;
      spelling: string;
      vocabulary: string;
      punctuation: string;
      style: string;
    };
  }
  interface PaletteOptions {
    highlighter?: PaletteOptions['primary'];
    tonal?: Palette['tonal'];
    marks?: Palette['marks'];
  }
  interface TypographyVariants {
    canvas: CSSObject;
    stat: CSSObject;
  }
  interface TypographyVariantsOptions {
    canvas?: CSSObject;
    stat?: CSSObject;
  }
  interface Theme {
    layout: typeof tokens.layout;
  }
  interface ThemeOptions {
    layout?: typeof tokens.layout;
  }
}
declare module '@mui/material/Typography' {
  interface TypographyPropsVariantOverrides {
    canvas: true;
    stat: true;
  }
}
declare module '@mui/material/Chip' {
  interface ChipPropsVariantOverrides {
    tonal: true;
  }
}
declare module '@mui/material/styles' {
  interface CssThemeVariables {
    enabled: true;
  }
}
function palette(t: typeof tokens.light | typeof tokens.dark): PaletteOptions {
  return {
    primary: { main: t.ink, contrastText: t.onPrimary },
    secondary: { main: t.violet },
    success: { main: t.mint, dark: t.mintText },
    info: { main: t.blue },
    warning: { main: t.amber },
    error: { main: t.rose },
    background: { default: t.paper, paper: t.surface },
    text: { primary: t.text, secondary: t.muted },
    divider: t.border,
    highlighter: { main: t.highlighter, light: t.highlightSoft, contrastText: tokens.light.ink },
    tonal: { primary: t.tonalPrimary, success: t.tonalSuccess },
    marks: {
      grammar: t.violet,
      spelling: t.rose,
      vocabulary: t.blue,
      punctuation: t.amber,
      style: t.teal,
    },
  };
}
const serif = 'var(--font-canvas), var(--font-canvas-vietnamese), Georgia, serif';
export function makeTheme() {
  return createTheme({
    direction: 'ltr',
    cssVariables: { colorSchemeSelector: '[data-mui-color-scheme="%s"]' },
    colorSchemes: {
      light: { palette: palette(tokens.light) },
      dark: { palette: palette(tokens.dark) },
    },
    layout: tokens.layout,
    shape: { borderRadius: 12 },
    typography: {
      fontFamily: 'var(--font-ui), var(--font-ui-vietnamese), system-ui, sans-serif',
      h1: {
        fontFamily: serif,
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.2,
        '@media (max-width:599.95px)': { fontSize: '1.625rem' },
      },
      h2: { fontFamily: serif, fontSize: '1.625rem', fontWeight: 600, lineHeight: 1.25 },
      h3: { fontSize: '1.125rem', fontWeight: 600, lineHeight: 1.3 },
      subtitle1: { fontSize: '0.9375rem', fontWeight: 600 },
      subtitle2: { fontSize: '0.8125rem', lineHeight: 1.3, fontWeight: 600 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.5 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.45 },
      caption: { fontSize: '0.75rem', lineHeight: 1.4 },
      button: { fontSize: '0.9375rem', lineHeight: 1.2, fontWeight: 600, textTransform: 'none' },
      canvas: {
        fontFamily: serif,
        fontSize: '1.375rem',
        lineHeight: 1.65,
        '@media (max-width:599.95px)': { fontSize: '1.1875rem', lineHeight: 1.6 },
      },
      stat: { fontFamily: serif, fontSize: '1.75rem', lineHeight: 1.1, fontWeight: 600 },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          body: { margin: 0 },
          'a,button,input,textarea,[tabindex]': {
            '&:focus-visible': {
              outline: '2px solid ' + theme.vars.palette.secondary.main,
              outlineOffset: 4,
            },
          },
          '@media (prefers-reduced-motion: reduce)': {
            '*, *::before, *::after': {
              scrollBehavior: 'auto',
              animationDuration: '0s',
              transitionDuration: '0s',
            },
          },
        }),
      },
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { borderRadius: tokens.radius.md, minHeight: 44, paddingInline: 20 },
          outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
        },
      },
      MuiIconButton: { styleOverrides: { root: { minHeight: 44, minWidth: 44 } } },
      MuiCheckbox: { styleOverrides: { root: { minHeight: 44, minWidth: 44 } } },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderRadius: tokens.radius.lg } },
      },
      MuiPaper: { styleOverrides: { outlined: { borderRadius: tokens.radius.lg } } },
      MuiChip: {
        variants: [
          {
            props: { variant: 'tonal', color: 'primary' },
            style: ({ theme }) => ({
              backgroundColor: theme.vars.palette.tonal.primary,
              color: theme.vars.palette.text.primary,
            }),
          },
          {
            props: { variant: 'tonal', color: 'success' },
            style: ({ theme }) => ({
              backgroundColor: theme.vars.palette.tonal.success,
              color: theme.vars.palette.text.primary,
            }),
          },
          {
            props: { variant: 'tonal', color: 'warning' },
            style: ({ theme }) => ({
              backgroundColor: theme.vars.palette.highlighter.light,
              color: theme.vars.palette.text.primary,
            }),
          },
        ],
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: tokens.radius.sm,
            minHeight: 44,
            marginBlock: theme.spacing(0.75),
            '&.Mui-selected': {
              backgroundColor: theme.vars.palette.highlighter.main,
              color: theme.vars.palette.highlighter.contrastText,
              '&:hover': { backgroundColor: theme.vars.palette.highlighter.main },
            },
          }),
        },
      },
      MuiListItemIcon: { styleOverrides: { root: { minWidth: 36, color: 'inherit' } } },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: 64,
            minWidth: 0,
            '&.Mui-selected': {
              color: theme.vars.palette.text.primary,
              '&::after': {
                content: '""',
                position: 'absolute',
                bottom: 6,
                width: 32,
                height: 3,
                backgroundColor: theme.vars.palette.highlighter.main,
              },
            },
          }),
        },
      },
      MuiOutlinedInput: { styleOverrides: { root: { borderRadius: tokens.radius.md } } },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 8, borderRadius: tokens.radius.pill },
          bar: { borderRadius: tokens.radius.pill },
        },
      },
    },
  });
}
