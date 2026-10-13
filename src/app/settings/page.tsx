import { cookies } from 'next/headers';
import { getLocale } from 'next-intl/server';
import { z } from 'zod';
import Settings from '@/components/layout/Settings';
const Preferences = z.object({
  explanation: z.enum(['es', 'en', 'ar']).catch('es'),
  daily: z.enum(['5', '15', '30']).catch('15'),
  weekly: z.enum(['3', '5', '7']).catch('5'),
  direction: z.enum(['ltr', 'rtl']),
});
export default async function Page() {
  const store = await cookies();
  const locale = await getLocale();
  const preferences = Preferences.parse({
    explanation: store.get('explanation')?.value,
    daily: store.get('daily')?.value,
    weekly: store.get('weekly')?.value,
    direction:
      store.get('direction')?.value === 'rtl' ||
      (locale === 'ar' && store.get('direction')?.value !== 'ltr')
        ? 'rtl'
        : 'ltr',
  });
  return <Settings preferences={preferences} />;
}
