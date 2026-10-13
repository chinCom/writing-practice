import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import localFont from 'next/font/local';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale } from 'next-intl/server';
import InitColorSchemeScript from '@mui/material/InitColorSchemeScript';
import Providers from '@/components/layout/Providers';
import AppShell from '@/components/layout/AppShell';
const ui = localFont({
  src: '../../node_modules/@fontsource-variable/schibsted-grotesk/files/schibsted-grotesk-latin-wght-normal.woff2',
  variable: '--font-ui',
  weight: '100 900',
  display: 'swap',
});
const canvas = localFont({
  src: '../../node_modules/@fontsource-variable/literata/files/literata-latin-wght-normal.woff2',
  variable: '--font-canvas',
  weight: '200 900',
  display: 'swap',
});
const arabicUi = localFont({
  src: '../../node_modules/@fontsource/noto-sans-arabic/files/noto-sans-arabic-arabic-400-normal.woff2',
  variable: '--font-arabic-ui',
  display: 'swap',
  preload: false,
});
const arabicSerif = localFont({
  src: '../../node_modules/@fontsource/noto-naskh-arabic/files/noto-naskh-arabic-arabic-400-normal.woff2',
  variable: '--font-arabic-serif',
  display: 'swap',
  preload: false,
});
export const metadata: Metadata = {
  title: 'Writing coach',
  description: 'A quiet space to practice English writing.',
};
export default async function Layout({ children }: { children: ReactNode }) {
  const [locale, store] = await Promise.all([getLocale(), cookies()]);
  const direction =
    store.get('direction')?.value === 'rtl' ||
    (locale === 'ar' && store.get('direction')?.value !== 'ltr')
      ? 'rtl'
      : 'ltr';
  return (
    <html
      lang={locale}
      dir={direction}
      suppressHydrationWarning
      className={[ui.variable, canvas.variable, arabicUi.variable, arabicSerif.variable].join(' ')}
    >
      <body>
        <InitColorSchemeScript attribute="data-mui-color-scheme" />
        <NextIntlClientProvider>
          <Providers direction={direction}>
            <AppShell>{children}</AppShell>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
