import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import { loadLesson } from '@/lib/db/curriculum';
import LessonView from '@/components/curriculum/LessonView';
import { ApiError } from '@/lib/api';
export default async function Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { lessonId } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(lessonId)) notFound();
  let lesson;
  try {
    lesson = await loadLesson(user.id, lessonId);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    if (error instanceof ApiError && error.status === 403) redirect('/path');
    throw error;
  }
  return <LessonView lesson={lesson} />;
}
