import type { CSSObject } from '@mui/material/styles';
import { createTheme, keyframes } from '@mui/material/styles';
import type { PaletteOptions } from '@mui/material/styles';
import '@mui/x-charts/themeAugmentation';
import { tokens } from './tokens';

// Determinate bars grow in once. Only the bar's transform animates, so aria-valuenow stays exact.
export const tickPop = keyframes`
  from { opacity: 0; transform: scale(0.6); }
`;

const barGrow = keyframes`
  from { transform: translateX(-100%); }
`;
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
    layout: {
      [Key in keyof typeof tokens.layout]: (typeof tokens.layout)[Key] extends number
        ? number
        : string;
    };
  }
  interface ThemeOptions {
    layout?: Theme['layout'];
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
function palette(t: { [Key in keyof typeof tokens.light]: string }): PaletteOptions {
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
export function makeTheme(today = false, cssVarPrefix = 'mui') {
  return createTheme({
    direction: 'ltr',
    cssVariables: { colorSchemeSelector: '[data-mui-color-scheme="%s"]', cssVarPrefix },
    colorSchemes: {
      light: {
        palette: palette(
          today
            ? {
                ...tokens.light,
                ink: tokens.today.ink,
                text: tokens.today.ink,
                muted: tokens.today.muted,
                mint: tokens.today.mint,
                highlightSoft: tokens.today.highlightSoft,
              }
            : tokens.light,
        ),
      },
      dark: { palette: palette(tokens.dark) },
    },
    layout: today ? { ...tokens.layout, ringSize: tokens.today.ringSize } : tokens.layout,
    shape: { borderRadius: today ? 10 : 12 },
    typography: {
      fontFamily: today
        ? 'Arial, var(--font-ui-vietnamese), sans-serif'
        : 'var(--font-ui), var(--font-ui-vietnamese), system-ui, sans-serif',
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
      ...(today
        ? {
            h1: {
              fontFamily: 'inherit',
              fontSize: '2.5rem',
              fontWeight: 700,
              lineHeight: 1.2,
              '@media (max-width:599.95px)': { fontSize: '1.875rem' },
            },
            h2: { fontFamily: 'inherit', fontSize: '1.875rem', fontWeight: 700, lineHeight: 1.3 },
            h3: { fontSize: '1.625rem', fontWeight: 700, lineHeight: 1.3 },
            subtitle1: { fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.5 },
            body1: { fontSize: '1.25rem', lineHeight: 1.5 },
            body2: { fontSize: '1rem', lineHeight: 1.5 },
            caption: { fontSize: '0.875rem', lineHeight: 1.4 },
            button: {
              fontSize: '1.125rem',
              fontWeight: 650,
              lineHeight: 1.25,
              textTransform: 'none',
            },
          }
        : {}),
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
          root: {
            borderRadius: today ? tokens.radius.sm : tokens.radius.md,
            minHeight: 44,
            paddingInline: today ? 24 : 20,
          },
          outlined: ({ theme }) => ({ borderColor: theme.vars.palette.divider }),
        },
      },
      MuiIconButton: { styleOverrides: { root: { minHeight: 44, minWidth: 44 } } },
      MuiCheckbox: { styleOverrides: { root: { minHeight: 44, minWidth: 44 } } },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: { root: { borderRadius: today ? 10 : tokens.radius.lg } },
      },
      MuiPaper: { styleOverrides: { outlined: { borderRadius: today ? 10 : tokens.radius.lg } } },
      MuiTab: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderBlockEnd: '1px solid',
            borderColor: theme.vars.palette.text.secondary,
          }),
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 4,
            '@media (prefers-reduced-motion: no-preference)': {
              transition:
                'left 250ms cubic-bezier(0.22, 0.7, 0.2, 1), width 250ms cubic-bezier(0.22, 0.7, 0.2, 1)',
            },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: today
            ? {
                fontSize: '1rem',
                color: 'inherit',
                padding: '3px 2px',
                borderColor: 'var(--mui-palette-divider)',
              }
            : {},
          head: today ? { fontWeight: 400 } : {},
        },
      },
      MuiChip: {
        styleOverrides: {
          sizeSmall: today
            ? { height: 34, fontSize: '1rem', '& .MuiChip-label': { paddingInline: 14 } }
            : {},
        },
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
            minHeight: today ? 52 : 44,
            marginBlock: theme.spacing(0.75),
            '&.Mui-selected': {
              backgroundColor: theme.vars.palette.highlighter.main,
              color: theme.vars.palette.highlighter.contrastText,
              '&:hover': { backgroundColor: theme.vars.palette.highlighter.main },
            },
          }),
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: today ? 44 : 36, color: 'inherit' } },
      },
      MuiListItemText: { styleOverrides: { primary: today ? { fontSize: '1.125rem' } : {} } },
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
      MuiLineChart: {
        // The line carries the value. A light fill keeps a flat level from becoming a solid block.
        defaultProps: { sx: { '& .MuiLineChart-area': { fillOpacity: 0.16 } } },
      },
      MuiCircularProgress: {
        // Rings fill slowly, then ease out. The component sets the value after mount.
        variants: [
          {
            props: { variant: 'determinate' },
            style: {
              '& .MuiCircularProgress-circle': {
                '@media (prefers-reduced-motion: no-preference)': {
                  transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 0.7, 0.2, 1)',
                },
                '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
              },
            },
          },
        ],
      },
      MuiLinearProgress: {
        styleOverrides: {
          root: { height: 8, borderRadius: tokens.radius.pill },
          bar: { borderRadius: tokens.radius.pill },
        },
        variants: [
          {
            props: { variant: 'determinate' },
            style: {
              '& .MuiLinearProgress-bar': {
                '@media (prefers-reduced-motion: no-preference)': {
                  animation: `${barGrow} 700ms cubic-bezier(0.22, 0.7, 0.2, 1) backwards`,
                  animationDelay: 'var(--bar-delay, 0ms)',
                },
              },
            },
          },
        ],
      },
    },
  });
}
