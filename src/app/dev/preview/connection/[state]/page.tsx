import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import ConnectionPreview from '@/components/layout/ConnectionPreview';

export default async function Page({ params }: { params: Promise<{ state: string }> }) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { state } = await params;
  if (!['ready', 'slow', 'error'].includes(state)) notFound();
  if (state === 'slow') await new Promise((resolve) => setTimeout(resolve, 8000));
  if (state === 'error' && (await cookies()).get('connection_preview_ready')?.value !== 'true') {
    throw new Error('Synthetic DATABASE_TIMEOUT for connection preview');
  }
  return <ConnectionPreview />;
}
