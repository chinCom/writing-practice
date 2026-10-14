import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Providers from '@/components/layout/Providers';
import AppShell from '@/components/layout/AppShell';
import { currentUser } from '@/lib/auth/server';
const ui = localFont({
  src: '../../node_modules/@fontsource-variable/noto-sans/files/noto-sans-latin-wght-normal.woff2',
  variable: '--font-ui',
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF,U+2000-206F,U+20AC,U+2122' }],
  adjustFontFallback: false,
  weight: '100 900',
  display: 'swap',
});
const canvas = localFont({
  src: '../../node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2',
  variable: '--font-canvas',
  declarations: [{ prop: 'unicode-range', value: 'U+0000-00FF,U+2000-206F,U+20AC,U+2122' }],
  adjustFontFallback: false,
  weight: '200 900',
  display: 'swap',
});
const vietnameseUi = localFont({
  src: '../../node_modules/@fontsource-variable/noto-sans/files/noto-sans-vietnamese-wght-normal.woff2',
  variable: '--font-ui-vietnamese',
  adjustFontFallback: false,
  weight: '100 900',
  display: 'swap',
  preload: false,
});
const vietnameseCanvas = localFont({
  src: '../../node_modules/@fontsource-variable/literata/files/literata-vietnamese-wght-normal.woff2',
  variable: '--font-canvas-vietnamese',
  adjustFontFallback: false,
  weight: '200 900',
  display: 'swap',
  preload: false,
});
export const metadata: Metadata = {
  title: 'Writing coach',
  description: 'A quiet space to practice English writing.',
};
export default async function Layout({ children }: { children: ReactNode }) {
  const [locale, user] = await Promise.all([getLocale(), currentUser()]);
  return (
    <html
      lang={locale}
      dir="ltr"
      suppressHydrationWarning
      className={[
        ui.variable,
        canvas.variable,
        vietnameseUi.variable,
        vietnameseCanvas.variable,
      ].join(' ')}
    >
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" />
        <NextIntlClientProvider>
          <Providers>
            <AppShell signedIn={Boolean(user)}>{children}</AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
