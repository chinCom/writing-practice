import { beforeEach, describe, expect, it, vi } from 'vitest';
import WritingPage from '@/app/write/[taskId]/page';
import LessonPage from '@/app/lesson/[lessonId]/page';
import { DomainError } from '@/lib/domain-error';

const dependencies = vi.hoisted(() => ({
  currentUser: vi.fn(),
  loadTask: vi.fn(),
  loadLesson: vi.fn(),
}));
vi.mock('server-only', () => ({}));
vi.mock('@/lib/auth/server', () => ({ currentUser: dependencies.currentUser }));
vi.mock('@/lib/db/curriculum', () => ({
  loadTask: dependencies.loadTask,
  loadLesson: dependencies.loadLesson,
}));
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('PAGE_NOT_FOUND');
  },
  redirect: (path: string) => {
    throw new Error('PAGE_REDIRECT:' + path);
  },
  useRouter: vi.fn(),
  usePathname: vi.fn(),
}));

const pages = [
  {
    name: 'writing',
    load: dependencies.loadTask,
    render: () =>
      WritingPage({
        params: Promise.resolve({ taskId: 'weekend' }),
        searchParams: Promise.resolve({}),
      }),
  },
  {
    name: 'lesson',
    load: dependencies.loadLesson,
    render: () => LessonPage({ params: Promise.resolve({ lessonId: 'first-words-1' }) }),
  },
];
beforeEach(() => {
  vi.resetAllMocks();
  dependencies.currentUser.mockResolvedValue({ id: 'verified-owner' });
});

describe.each(pages)('$name page access', ({ load, render }) => {
  it.each([
    ['NOT_FOUND', 'PAGE_NOT_FOUND'],
    ['LESSON_LOCKED', 'PAGE_REDIRECT:/path'],
    ['WARMUPS_REQUIRED', 'PAGE_REDIRECT:/path'],
  ] as const)('preserves navigation for domain reason %s', async (code, destination) => {
    load.mockRejectedValue(new DomainError(code));
    await expect(render()).rejects.toThrow(destination);
  });

  it('does not turn an unexpected failure into an access redirect', async () => {
    const error = new Error('Unexpected database failure');
    load.mockRejectedValue(error);
    await expect(render()).rejects.toBe(error);
  });

  it('still redirects a signed-out learner before loading account data', async () => {
    dependencies.currentUser.mockResolvedValue(null);
    await expect(render()).rejects.toThrow('PAGE_REDIRECT:/login');
    expect(load).not.toHaveBeenCalled();
  });
});
