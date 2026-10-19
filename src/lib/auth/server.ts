import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { authConfigured } from './config';
import { traceOperation } from '@/lib/observability/server';
export async function authClient() {
  if (!authConfigured()) return null;
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (values) => {
          try {
            values.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
          } catch {
            /* Server Components cannot write cookies; proxy refreshes them. */
          }
        },
      },
    },
  );
}
// Share validation between the layout and page within one server render only.
export const currentUser = cache(async function currentUser() {
  const client = await authClient();
  if (!client) return null;
  const {
    data: { user },
    error,
  } = await traceOperation('auth.getUser.render', () => client.auth.getUser());
  return error ? null : user;
});
