import { redirect, notFound } from 'next/navigation';
import { z } from 'zod';
import { currentUser } from '@/lib/auth/server';
import RevisionComparison from '@/components/portfolio/RevisionComparison';
import { pageMetadata } from '@/lib/i18n/metadata';
export function generateMetadata() {
  return pageMetadata('revision');
}
export default async function Page({ params }: { params: Promise<{ submissionId: string }> }) {
  if (!(await currentUser())) redirect('/login');
  const { submissionId } = await params;
  if (!z.uuid().safeParse(submissionId).success) notFound();
  return <RevisionComparison submissionId={submissionId} />;
}
