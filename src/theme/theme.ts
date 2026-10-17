import type { CSSObject, Shadows } from '@mui/material/styles';
import { createTheme, keyframes } from '@mui/material/styles';
import type { PaletteOptions } from '@mui/material/styles';
import '@mui/x-charts/themeAugmentation';
import { tokens } from './tokens';
import { landingStyles } from './landing';

// Determinate bars grow in once. Only the bar's transform animates, so aria-valuenow stays exact.
export const tickPop = keyframes`
  from { opacity: 0; transform: scale(0.6); }
`;

const barGrow = keyframes`
  from { transform: translateX(-100%); }
`;

const easeOut = 'cubic-bezier(0.22, 0.7, 0.2, 1)';

declare module '@mui/material/styles' {
  interface Palette {
    highlighter: Palette['primary'];
    tonal: { primary: string; success: string };
    pastel: {
      lilac: string;
      blue: string;
      mint: string;
      peach: string;
      rose: string;
      sand: string;
    };
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
    pastel?: Palette['pastel'];
    marks?: Palette['marks'];
  }
  interface TypographyVariants {
    canvas: CSSObject;
    stat: CSSObject;
    eyebrow: CSSObject;
    landingTitle: CSSObject;
    landingSection: CSSObject;
    landingCard: CSSObject;
  }
  interface TypographyVariantsOptions {
    canvas?: CSSObject;
    stat?: CSSObject;
    eyebrow?: CSSObject;
    landingTitle?: CSSObject;
    landingSection?: CSSObject;
    landingCard?: CSSObject;
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
    eyebrow: true;
    landingTitle: true;
    landingSection: true;
    landingCard: true;
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

type PaletteTokens = {
  [Key in keyof typeof tokens.light]: string;
};

function palette(t: PaletteTokens): PaletteOptions {
  return {
    primary: { main: t.ink, contrastText: t.onPrimary },
    secondary: { main: t.violet, contrastText: t.onPrimary },
    success: { main: t.mint, dark: t.mintText, contrastText: t.onPrimary },
    info: { main: t.blue },
    warning: { main: t.amber },
    error: { main: t.rose },
    background: { default: t.paper, paper: t.surface },
    text: { primary: t.text, secondary: t.muted },
    divider: t.border,
    highlighter: { main: t.highlighter, light: t.highlightSoft, contrastText: tokens.light.ink },
    tonal: { primary: t.tonalPrimary, success: t.tonalSuccess },
    pastel: {
      lilac: t.pastelLilac,
      blue: t.pastelBlue,
      mint: t.pastelMint,
      peach: t.pastelPeach,
      rose: t.pastelRose,
      sand: t.pastelSand,
    },
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

export function makeTheme(cssVarPrefix = 'mui') {
  return createTheme({
    direction: 'ltr',
    cssVariables: { colorSchemeSelector: '[data-mui-color-scheme="%s"]', cssVarPrefix },
    colorSchemes: {
      light: { palette: palette(tokens.light) },
      dark: { palette: palette(tokens.dark) },
    },
    layout: tokens.layout,
    shadows: Array.from({ length: 25 }, (_, index) =>
      index === 0 ? 'none' : tokens.shadow.raised,
    ) as Shadows,
    shape: { borderRadius: tokens.radius.unit },
    typography: {
      fontFamily: 'var(--font-ui), var(--font-ui-vietnamese), system-ui, sans-serif',
      h1: {
        fontFamily: serif,
        fontSize: '3rem',
        fontWeight: 600,
        lineHeight: 1.05,
        letterSpacing: '-0.025em',
        '@media (max-width:599.95px)': { fontSize: '2.25rem', letterSpacing: '-0.02em' },
      },
      h2: {
        fontFamily: serif,
        fontSize: '2rem',
        fontWeight: 600,
        lineHeight: 1.16,
        letterSpacing: '-0.015em',
        '@media (max-width:599.95px)': { fontSize: '1.625rem' },
      },
      h3: { fontFamily: serif, fontSize: '1.25rem', fontWeight: 600, lineHeight: 1.3 },
      h4: { fontSize: '1.0625rem', fontWeight: 650, lineHeight: 1.35 },
      subtitle1: { fontSize: '1rem', fontWeight: 650, lineHeight: 1.4 },
      subtitle2: { fontSize: '0.8125rem', lineHeight: 1.4, fontWeight: 650 },
      body1: { fontSize: '0.9375rem', lineHeight: 1.55 },
      body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
      caption: { fontSize: '0.75rem', lineHeight: 1.45 },
      button: { fontSize: '0.9375rem', lineHeight: 1.2, fontWeight: 650, textTransform: 'none' },
      canvas: {
        fontFamily: serif,
        fontSize: '1.375rem',
        lineHeight: 1.65,
        '@media (max-width:599.95px)': { fontSize: '1.1875rem', lineHeight: 1.6 },
      },
      stat: { fontFamily: serif, fontSize: '2.5rem', lineHeight: 1, fontWeight: 600 },
      eyebrow: {
        fontSize: '0.6875rem',
        fontWeight: 700,
        lineHeight: 1.3,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
      },
      landingTitle: {
        fontFamily: 'var(--font-ui), var(--font-ui-vietnamese), system-ui, sans-serif',
        fontSize: '4.25rem',
        fontWeight: 800,
        lineHeight: 1.04,
        letterSpacing: '-0.04em',
        '@media (max-width:1199.95px)': { fontSize: '2.75rem' },
        '@media (max-width:599.95px)': { fontSize: '2.5rem' },
      },
      landingSection: {
        fontFamily: 'var(--font-ui), var(--font-ui-vietnamese), system-ui, sans-serif',
        fontSize: '2.5rem',
        fontWeight: 800,
        lineHeight: 1.14,
        letterSpacing: '-0.035em',
        '@media (max-width:1199.95px)': { fontSize: '2rem' },
        '@media (max-width:599.95px)': { fontSize: '1.875rem' },
      },
      landingCard: {
        fontFamily: 'var(--font-ui), var(--font-ui-vietnamese), system-ui, sans-serif',
        fontSize: '1.0625rem',
        fontWeight: 700,
        lineHeight: 1.35,
        letterSpacing: '-0.015em',
        '@media (max-width:1199.95px)': { fontSize: '1rem' },
      },
    },
    components: {
      MuiCssBaseline: {
        styleOverrides: (theme) => ({
          html: { WebkitTextSizeAdjust: '100%' },
          '[data-landing]': landingStyles(theme),
          body: {
            margin: 0,
            backgroundColor: theme.vars.palette.background.default,
            color: theme.vars.palette.text.primary,
          },
          '::selection': {
            backgroundColor: theme.vars.palette.tonal.primary,
            color: theme.vars.palette.text.primary,
          },
          'a,button,input,textarea,[tabindex]': {
            '&:focus-visible': {
              outline: '2px solid ' + theme.vars.palette.secondary.main,
              outlineOffset: 3,
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
            borderRadius: tokens.radius.md,
            minHeight: 44,
            paddingInline: 22,
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
            '@media (prefers-reduced-motion: no-preference)': {
              transition: `background-color 160ms ${easeOut}, border-color 160ms ${easeOut}, color 160ms ${easeOut}, transform 120ms ${easeOut}`,
            },
            '&:active': { transform: 'translateY(1px)' },
          },
          contained: ({ theme }) => ({
            backgroundColor: theme.vars.palette.primary.main,
            '&:hover': { backgroundColor: theme.vars.palette.primary.main, opacity: 0.9 },
          }),
          outlined: ({ theme }) => ({
            borderColor: theme.vars.palette.divider,
            backgroundColor: theme.vars.palette.background.paper,
            '&:hover': {
              borderColor: theme.vars.palette.primary.main,
              backgroundColor: theme.vars.palette.background.paper,
            },
          }),
          text: ({ theme }) => ({
            '&:hover': { backgroundColor: theme.vars.palette.tonal.primary },
          }),
        },
      },
      MuiIconButton: {
        styleOverrides: {
          root: {
            minHeight: 44,
            minWidth: 44,
            borderRadius: tokens.radius.sm,
            '&:hover': { backgroundColor: 'var(--mui-palette-tonal-primary)' },
          },
        },
      },
      MuiCheckbox: { styleOverrides: { root: { minHeight: 44, minWidth: 44 } } },
      MuiCard: {
        defaultProps: { variant: 'outlined' },
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: tokens.radius.lg,
            borderColor: theme.vars.palette.divider,
            backgroundImage: 'none',
            boxShadow: tokens.shadow.card,
          }),
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', boxShadow: 'none' },
          outlined: ({ theme }) => ({
            borderRadius: tokens.radius.lg,
            borderColor: theme.vars.palette.divider,
          }),
          rounded: { borderRadius: tokens.radius.lg },
        },
      },
      MuiDivider: {
        styleOverrides: { root: ({ theme }) => ({ borderColor: theme.vars.palette.divider }) },
      },
      MuiTab: {
        styleOverrides: {
          root: {
            borderBlockEnd: '1px solid',
            borderColor: 'var(--mui-palette-divider)',
            textTransform: 'none',
            minHeight: 44,
            fontWeight: 600,
            paddingInline: 18,
          },
        },
      },
      MuiTabs: {
        styleOverrides: {
          indicator: {
            height: 4,
            borderRadius: tokens.radius.pill,
            backgroundColor: 'var(--mui-palette-secondary-main)',
            '@media (prefers-reduced-motion: no-preference)': {
              transition: `left 250ms ${easeOut}, width 250ms ${easeOut}`,
            },
            '@media (prefers-reduced-motion: reduce)': { transition: 'none' },
          },
        },
      },
      MuiTableCell: {
        styleOverrides: {
          root: ({ theme }) => ({
            fontSize: '0.875rem',
            color: 'inherit',
            padding: '12px 10px',
            borderColor: theme.vars.palette.divider,
          }),
          head: {
            fontSize: '0.75rem',
            fontWeight: 650,
            color: 'var(--mui-palette-text-secondary)',
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          icon: ({ theme }) => ({ color: theme.vars.palette.secondary.main, fontSize: 18 }),
          root: {
            borderRadius: tokens.radius.pill,
            height: 28,
            fontWeight: 600,
            '& .MuiChip-label': { paddingInline: 12 },
          },
          sizeSmall: { height: 26, fontSize: '0.75rem' },
        },
        variants: [
          {
            props: { variant: 'tonal', color: 'primary' },
            style: ({ theme }) => ({
              backgroundColor: theme.vars.palette.tonal.primary,
              color: theme.vars.palette.secondary.main,
            }),
          },
          {
            props: { variant: 'tonal', color: 'success' },
            style: ({ theme }) => ({
              backgroundColor: theme.vars.palette.tonal.success,
              color: theme.vars.palette.success.dark,
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
      MuiToggleButton: {
        styleOverrides: {
          root: {
            border: 0,
            borderRadius: '8px',
            textTransform: 'none',
            color: 'var(--mui-palette-text-secondary)',
          },
          selected: ({ theme }) => ({
            backgroundColor: theme.vars.palette.background.paper,
            color: theme.vars.palette.text.primary,
            boxShadow: theme.shadows[1],
            '&:hover': { backgroundColor: theme.vars.palette.background.paper },
          }),
        },
      },
      MuiListItemButton: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: tokens.radius.md,
            minHeight: 48,
            marginBlock: 2,
            color: theme.vars.palette.text.primary,
            '&:hover': { backgroundColor: theme.vars.palette.tonal.primary },
            '&.Mui-selected': {
              backgroundColor: theme.vars.palette.tonal.primary,
              color: theme.vars.palette.primary.main,
              '&:hover': { backgroundColor: theme.vars.palette.tonal.primary },
              '& .MuiListItemIcon-root': { color: theme.vars.palette.secondary.main },
            },
          }),
        },
      },
      MuiListItemIcon: {
        styleOverrides: { root: { minWidth: 40, color: 'inherit' } },
      },
      MuiListItemText: {
        styleOverrides: { primary: { fontSize: '0.9375rem', fontWeight: 550 } },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: ({ theme }) => ({
            minHeight: 64,
            minWidth: 0,
            color: theme.vars.palette.text.secondary,
            '&.Mui-selected': { color: theme.vars.palette.primary.main },
            '& .MuiBottomNavigationAction-label': { fontSize: '0.75rem', fontWeight: 600 },
          }),
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: tokens.radius.md,
            backgroundColor: theme.vars.palette.background.paper,
            '& .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.vars.palette.divider,
            },
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: theme.vars.palette.text.secondary,
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderWidth: 2,
              borderColor: theme.vars.palette.secondary.main,
            },
          }),
        },
      },
      MuiAccordion: {
        styleOverrides: {
          root: ({ theme }) => ({
            borderRadius: tokens.radius.md,
            border: '1px solid ' + theme.vars.palette.divider,
            boxShadow: 'none',
            backgroundImage: 'none',
            '&::before': { display: 'none' },
            '&.Mui-expanded': { margin: 0 },
          }),
        },
      },
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
                  transition: `stroke-dashoffset 900ms ${easeOut}`,
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
                  animation: `${barGrow} 700ms ${easeOut} backwards`,
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
