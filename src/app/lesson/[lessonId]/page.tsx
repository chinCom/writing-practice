import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/server';
import { loadLesson } from '@/lib/db/curriculum';
import LessonView from '@/components/curriculum/LessonView';
import { DomainError } from '@/lib/domain-error';
export default async function Page({ params }: { params: Promise<{ lessonId: string }> }) {
  const user = await currentUser();
  if (!user) redirect('/login');
  const { lessonId } = await params;
  if (!/^[a-z0-9-]{1,80}$/.test(lessonId)) notFound();
  let lesson;
  try {
    lesson = await loadLesson(user.id, lessonId);
  } catch (error) {
    if (error instanceof DomainError && error.code === 'NOT_FOUND') notFound();
    if (
      error instanceof DomainError &&
      (error.code === 'LESSON_LOCKED' || error.code === 'WARMUPS_REQUIRED')
    )
      redirect('/path');
    throw error;
  }
  return <LessonView lesson={lesson} />;
}
