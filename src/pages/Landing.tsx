import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight, Clock3, Menu, PlayCircle, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useLessons } from '@/hooks/useLessons';
import { CATEGORY_LABELS } from '@/types';
import { formatDate, formatDuration, truncate } from '@/lib/utils';

const fallbackTodayLesson = {
  title: 'Laws of Rising in the Morning',
  category: 'other' as const,
  description:
    'This lesson covers the foundational obligations upon waking each morning — from the recitation of Modeh Ani to washing one\'s hands (Netilat Yadayim).',
  duration: 14,
};

export default function Landing() {
  const { user, isAdmin } = useAuth();
  const { data: lessons = [] } = useLessons();

  const todayLesson = lessons[0] || null;
  const recentLessons = lessons.slice(0, 6);
  const displayLesson = todayLesson || fallbackTodayLesson;

  return (
    <div className="min-h-screen bg-white text-[#1f2937]">
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-[#e1e7ef] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 bg-gradient-to-br from-[#17365f] to-[#2a5688] rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <BookOpen className="h-5 w-5 text-white" />
              </div>
              <div className="leading-tight">
                <span className="font-bold text-[#1f2937] text-lg">DailySeif</span>
                <span className="block text-xs text-[#65758b] leading-none">Daily Kitzur Shulchan Aruch learning for every Jew.</span>
              </div>
            </Link>

            <div className="flex items-center gap-2 sm:gap-3">
              {user ? (
                <>
                  <Link to="/dashboard">
                    <Button variant="ghost" size="sm" className="text-[#1f2937] hover:bg-[#f2f4f8]">
                      Dashboard
                    </Button>
                  </Link>
                  {isAdmin && (
                    <Link to="/upload">
                      <Button size="sm" className="bg-[#1c3d6e] hover:bg-[#16345e] active:bg-[#122b4d] focus:ring-[#1c3d6e]">
                        Admin
                      </Button>
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Link to="/signin">
                    <Button variant="ghost" size="sm" className="text-[#1f2937] hover:bg-[#f2f4f8]">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/signup">
                    <Button size="sm" className="bg-[#1c3d6e] hover:bg-[#16345e] active:bg-[#122b4d] focus:ring-[#1c3d6e]">
                      Get Started
                    </Button>
                  </Link>
                </>
              )}
              <button className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-[#f2f4f8]" aria-label="Menu">
                <Menu className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
          <div className="flex items-center gap-2 text-sm text-[#65758b] mb-5">
            <Sparkles className="h-4 w-4 text-[#1c3d6e]" />
            <span>Today&apos;s Lesson</span>
            <span>•</span>
            <span>{formatDate(new Date())}</span>
          </div>

          <div className="grid lg:grid-cols-[1.3fr_0.7fr] gap-6 items-start">
            <div className="rounded-[28px] border border-[#e1e7ef] bg-white shadow-[0_20px_60px_-30px_rgba(28,61,110,0.42)] overflow-hidden">
              <div className="aspect-video bg-gradient-to-br from-[#17365f] via-[#1c3d6e] to-[#2a5688] relative overflow-hidden">
                {todayLesson?.thumbnailUrl ? (
                  <Link to={`/lesson/${todayLesson.id}`} className="absolute inset-0 group">
                    <img
                      src={todayLesson.thumbnailUrl}
                      alt={todayLesson.title}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <div className="h-16 w-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                        <PlayCircle className="h-9 w-9 text-[#1c3d6e]" />
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center text-white px-6">
                      <div className="mx-auto mb-3 h-16 w-16 rounded-2xl bg-white/10 border border-white/15 flex items-center justify-center">
                        <PlayCircle className="h-8 w-8 text-white" />
                      </div>
                      <p className="text-sm text-[#d9e6f5]">{todayLesson ? 'Open the lesson to watch' : 'No video available'}</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-6 sm:p-8">
                <p className="text-sm font-semibold text-[#1c3d6e] uppercase tracking-[0.2em] mb-3">
                  {todayLesson ? CATEGORY_LABELS[todayLesson.category] : "Today's Lesson"}
                </p>
                <h1 className="text-4xl sm:text-5xl font-extrabold text-[#1f2937] leading-tight max-w-3xl">
                  {displayLesson.title}
                </h1>
                {todayLesson?.titleHebrew ? (
                  <p className="mt-3 text-lg text-[#65758b] rtl">{todayLesson.titleHebrew}</p>
                ) : null}
                <p className="mt-5 text-lg text-[#65758b] leading-relaxed max-w-2xl">
                  {displayLesson.description}
                </p>

                <div className="mt-6 flex items-center gap-3 flex-wrap">
                  <Link to={todayLesson ? `/lesson/${todayLesson.id}` : '/dashboard'}>
                    <Button
                      size="lg"
                      className="bg-[#1c3d6e] hover:bg-[#16345e] active:bg-[#122b4d] focus:ring-[#1c3d6e]"
                      rightIcon={<ChevronRight className="h-5 w-5" />}
                    >
                      Open Full Lesson
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button size="lg" variant="ghost" className="text-[#1c3d6e] hover:bg-[#f2f4f8]">
                      Lesson Library
                    </Button>
                  </Link>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-4 text-sm text-[#65758b]">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock3 className="h-4 w-4" />
                    {todayLesson?.duration ? formatDuration(todayLesson.duration) : 'No video available'}
                  </span>
                  {todayLesson?.publishedAt ? <span>{formatDate(todayLesson.publishedAt)}</span> : null}
                </div>
              </div>
            </div>

            <aside className="rounded-[28px] bg-[#f8fafc] border border-[#e1e7ef] overflow-hidden">
              <div className="p-5 sm:p-6 border-b border-[#e1e7ef]">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <h2 className="text-xl font-bold text-[#1f2937]">Recent Lessons</h2>
                  <Link to="/dashboard" className="text-sm font-medium text-[#1c3d6e] hover:underline">
                    View all
                  </Link>
                </div>

                {recentLessons.length === 0 ? (
                  <p className="text-sm text-[#65758b]">No lessons published yet.</p>
                ) : (
                  <div className="space-y-3">
                    {recentLessons.map((lesson) => (
                      <Link
                        key={lesson.id}
                        to={`/lesson/${lesson.id}`}
                        className="block rounded-2xl bg-white border border-[#e1e7ef] p-4 hover:border-[#cfd9e6] hover:bg-[#fdfefe] transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#e9f1fb] flex items-center justify-center flex-shrink-0 overflow-hidden">
                            {lesson.thumbnailUrl ? (
                              <img src={lesson.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <PlayCircle className="h-4.5 w-4.5 text-[#1c3d6e]" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 text-xs text-[#65758b] mb-1">
                              <span className="rounded-full bg-[#f2f4f8] px-2 py-0.5 text-[#1c3d6e]">{CATEGORY_LABELS[lesson.category]}</span>
                              {lesson.duration ? <span>{formatDuration(lesson.duration)}</span> : null}
                            </div>
                            <h3 className="font-semibold text-[#1f2937] leading-snug truncate">{lesson.title}</h3>
                            <p className="text-sm text-[#65758b] mt-1 truncate">{truncate(lesson.description, 72)}</p>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-5 sm:p-6 bg-[#1c3d6e] text-white">
                <div className="text-sm font-semibold mb-1">{user ? 'DailySeif' : 'Join DailySeif'}</div>
                <p className="text-sm text-[#d9e6f5] leading-relaxed">
                  {user
                    ? 'Continue learning, track progress, and open lessons from the library.'
                    : 'Sign in to save progress and access admin tools if your account is approved.'}
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="text-2xl font-bold text-[#1f2937]">Recent Lessons</h2>
              <Link to="/dashboard" className="text-sm font-medium text-[#1c3d6e] hover:underline">
                View all
              </Link>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentLessons.length === 0 ? (
                <div className="sm:col-span-2 lg:col-span-3 rounded-2xl border border-[#e1e7ef] bg-[#f8fafc] p-6 text-[#65758b]">
                  No lessons available yet.
                </div>
              ) : (
                recentLessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    to={`/lesson/${lesson.id}`}
                    className="group rounded-2xl bg-white border border-[#e1e7ef] overflow-hidden shadow-sm hover:shadow-lg transition-all"
                  >
                    <div className="aspect-[16/9] bg-gradient-to-br from-[#17365f] via-[#1c3d6e] to-[#2a5688] relative overflow-hidden">
                      {lesson.thumbnailUrl ? (
                        <img
                          src={lesson.thumbnailUrl}
                          alt={lesson.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-white/40" />
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 to-transparent p-4">
                        <div className="inline-flex items-center rounded-full bg-white/15 backdrop-blur-sm px-2.5 py-1 text-xs text-white">
                          {CATEGORY_LABELS[lesson.category]}
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center gap-2 text-xs text-[#65758b] mb-2">
                        <span className="flex items-center gap-1">
                          <Clock3 className="h-3.5 w-3.5" />
                          {lesson.duration ? formatDuration(lesson.duration) : '—'}
                        </span>
                        {lesson.publishedAt ? <span>{formatDate(lesson.publishedAt)}</span> : null}
                      </div>
                      <h3 className="font-semibold text-[#1f2937] leading-snug line-clamp-2">{lesson.title}</h3>
                      <p className="mt-2 text-sm text-[#65758b] line-clamp-2">{truncate(lesson.description, 96)}</p>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </section>

        <footer className="bg-[#f8fafc] border-t border-[#e1e7ef] px-4 sm:px-6 lg:px-8 py-10">
          <div className="max-w-7xl mx-auto grid gap-8 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.8fr]">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <div className="h-8 w-8 bg-gradient-to-br from-[#17365f] to-[#2a5688] rounded-lg flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-[#1f2937]">DailySeif</span>
              </div>
              <p className="text-sm text-[#65758b] max-w-sm">Daily study of Kitzur Shulchan Aruch.</p>
            </div>

            <div>
              <h3 className="font-semibold text-[#1f2937] mb-3">Learn</h3>
              <ul className="space-y-2 text-sm text-[#65758b]">
                <li><Link to="/dashboard" className="hover:text-[#1c3d6e] transition-colors">Today&apos;s Lesson</Link></li>
                <li><Link to="/dashboard" className="hover:text-[#1c3d6e] transition-colors">Lesson Library</Link></li>
                <li><Link to="/dashboard" className="hover:text-[#1c3d6e] transition-colors">Catch Up</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#1f2937] mb-3">About</h3>
              <ul className="space-y-2 text-sm text-[#65758b]">
                <li><Link to="/dashboard" className="hover:text-[#1c3d6e] transition-colors">About DailySeif</Link></li>
                <li><Link to="/dashboard" className="hover:text-[#1c3d6e] transition-colors">Kitzur Shulchan Aruch</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#1f2937] mb-3">Admin</h3>
              <ul className="space-y-2 text-sm text-[#65758b]">
                <li><Link to="/upload" className="hover:text-[#1c3d6e] transition-colors">Dashboard</Link></li>
                <li><Link to="/upload" className="hover:text-[#1c3d6e] transition-colors">Upload Class</Link></li>
              </ul>
            </div>
          </div>
          <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-[#e1e7ef] text-sm text-[#65758b]">
            © {new Date().getFullYear()} DailySeif. All rights reserved.
          </div>
        </footer>
      </main>
    </div>
  );
}
