import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Providers from '@/components/layout/Providers';
import AppShell from '@/components/layout/AppShell';
import { currentUser } from '@/lib/auth/server';
import WebVitals from '@/components/layout/WebVitals';
import { rootMetadata } from '@/lib/i18n/metadata';
const handwriting = localFont({
  src: '../../public/fonts/caveat-variable.ttf',
  variable: '--font-handwriting',
  weight: '400 700',
  display: 'swap',
  preload: false,
});
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
export function generateMetadata(): Promise<Metadata> {
  return rootMetadata();
}
export default async function Layout({ children }: { children: ReactNode }) {
  const locale = await getLocale();
  // Only the account button needs the session, so each route's loading UI streams without waiting for auth.
  const signedIn = currentUser().then(Boolean, () => false);
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
        handwriting.variable,
      ].join(' ')}
    >
      <body>
        {process.env.PERFORMANCE_TELEMETRY === 'true' ? (
          <WebVitals
            sampleRate={Math.min(
              1,
              Math.max(0, Number(process.env.PERFORMANCE_SAMPLE_RATE ?? '0.1') || 0),
            )}
          />
        ) : null}
        <InitColorSchemeScript attribute="data-mui-color-scheme" />
        <NextIntlClientProvider>
          <Providers>
            <AppShell signedIn={signedIn}>{children}</AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
