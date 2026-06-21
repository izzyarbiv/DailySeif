import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  PlayCircle,
  FileText,
  Clock,
  BookOpen,
  Flame,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLessons } from '@/hooks/useLessons';
import { useUserProgress } from '@/hooks/useProgress';
import Layout from '@/components/layout/Layout';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import ProgressBar from '@/components/ui/ProgressBar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CATEGORY_LABELS, CATEGORY_COLORS, type LessonCategory } from '@/types';
import { formatDuration, truncate } from '@/lib/utils';

export default function Dashboard() {
  const { user, isAdmin } = useAuth();
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<LessonCategory | undefined>();

  const { data: lessons = [], isLoading } = useLessons(activeCategory, search);
  const { data: progressList = [] } = useUserProgress(user?.uid);

  const completedIds = new Set(progressList.filter((p) => p.completed).map((p) => p.lessonId));
  const totalCompleted = completedIds.size;
  const totalLessons = lessons.length;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Shalom, {user?.displayName?.split(' ')[0] || 'Student'} 👋
          </h1>
          <p className="text-gray-500 mt-1">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Flame className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{user?.streak || 0}</div>
                <div className="text-xs text-gray-500">Day streak</div>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalCompleted}</div>
                <div className="text-xs text-gray-500">Completed</div>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">{totalLessons}</div>
                <div className="text-xs text-gray-500">Available</div>
              </div>
            </div>
          </Card>
          <Card padding="md">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900">
                  {totalLessons > 0 ? Math.round((totalCompleted / totalLessons) * 100) : 0}%
                </div>
                <div className="text-xs text-gray-500">Progress</div>
              </div>
            </div>
          </Card>
        </div>

        {/* Progress bar */}
        {totalLessons > 0 && (
          <Card padding="md" className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700">Overall Progress</span>
              <span className="text-sm text-gray-500">{totalCompleted} / {totalLessons} shiurim</span>
            </div>
            <ProgressBar value={totalCompleted} max={totalLessons} size="lg" color="blue" />
          </Card>
        )}

        {/* Admin quick action */}
        {isAdmin && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-800">
              <span className="text-lg">⭐</span>
              <span className="font-medium text-sm">Admin: Upload a new class to share with students</span>
            </div>
            <Link to="/upload" className="text-amber-700 hover:text-amber-900 font-medium text-sm flex items-center gap-1">
              Upload <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        )}

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search shiurim…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <button
              onClick={() => setActiveCategory(undefined)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                !activeCategory ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              All
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveCategory(activeCategory === key as LessonCategory ? undefined : key as LessonCategory)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Lessons grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : lessons.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-500">
              {search ? 'No shiurim match your search' : 'No shiurim yet'}
            </h3>
            <p className="text-gray-400 text-sm mt-1">
              {isAdmin ? 'Upload your first class to get started!' : 'Check back soon for new content.'}
            </p>
            {isAdmin && (
              <Link to="/upload" className="inline-flex items-center gap-1 mt-4 text-blue-600 font-medium hover:underline text-sm">
                Upload a class <ChevronRight className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {lessons.map((lesson) => {
              const done = completedIds.has(lesson.id);
              return (
                <Link key={lesson.id} to={`/lesson/${lesson.id}`} className="block">
                  <Card hover className="h-full group relative overflow-hidden p-0">
                    {/* Thumbnail */}
                    <div className="relative h-40 bg-gradient-to-br from-blue-600 to-indigo-700 overflow-hidden">
                      {lesson.thumbnailUrl ? (
                        <img src={lesson.thumbnailUrl} alt={lesson.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <BookOpen className="h-12 w-12 text-white/40" />
                        </div>
                      )}
                      {/* Play overlay */}
                      {lesson.videoUrl && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                          <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                            <PlayCircle className="h-7 w-7 text-blue-600" />
                          </div>
                        </div>
                      )}
                      {done && (
                        <div className="absolute top-2 right-2 bg-green-500 text-white rounded-full p-1">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                    </div>

                    <div className="p-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[lesson.category]}`}>
                          {CATEGORY_LABELS[lesson.category]}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                          {lesson.duration && (
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> {formatDuration(lesson.duration)}
                            </span>
                          )}
                          {lesson.pdfUrl && <FileText className="h-3.5 w-3.5" />}
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 leading-snug mb-1 group-hover:text-blue-700 transition-colors">
                        {lesson.title}
                      </h3>
                      {lesson.titleHebrew && (
                        <p className="text-sm text-gray-500 rtl mb-1">{lesson.titleHebrew}</p>
                      )}
                      <p className="text-xs text-gray-500 leading-relaxed">{truncate(lesson.description, 80)}</p>

                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-xs text-gray-400">{lesson.instructor}</span>
                        {done ? (
                          <Badge variant="success">Completed</Badge>
                        ) : (
                          <span className="text-xs text-blue-600 font-medium flex items-center gap-1">
                            Watch now <ChevronRight className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
