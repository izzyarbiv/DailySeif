import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import YouTubePlayer from '@/components/ui/YouTubePlayer';
import {
  ArrowLeft,
  ChevronRight,
  BookOpen,
  FileText,
  CheckCircle2,
  Bookmark,
  BookmarkCheck,
  StickyNote,
  Clock,
  Eye,
  Download,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLesson, useLessons } from '@/hooks/useLessons';
import { useProgress, useSaveProgress, useToggleBookmark } from '@/hooks/useProgress';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';
import { formatDuration, formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function LessonViewer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: lesson, isLoading, error } = useLesson(id);
  const { data: progress } = useProgress(user?.uid, id);
  const { data: allLessons = [] } = useLessons(lesson?.category);

  const saveProgress = useSaveProgress();
  const toggleBookmark = useToggleBookmark();

  const [notesDraft, setNotesDraft] = useState('');
  const [notesTouched, setNotesTouched] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  const [savingNote, setSavingNote] = useState(false);
  const [mediaTab, setMediaTab] = useState<'video' | 'audio'>('video');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const isBookmarked = user?.bookmarks?.includes(id || '') ?? false;
  const isCompleted = progress?.completed ?? false;
  const notes = notesTouched ? notesDraft : (progress?.notes ?? '');

  useEffect(() => {
    return () => { clearTimeout(saveTimer.current); };
  }, []);

  // Called by YouTubePlayer every second while playing
  const handleTimeUpdate = (currentTime: number) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (user?.uid && id && currentTime > 0) {
        saveProgress.mutate({ userId: user.uid, lessonId: id, watchedSeconds: Math.floor(currentTime) });
      }
    }, 15000);
  };

  const handleMarkComplete = async () => {
    if (!user?.uid || !id) return;
    await saveProgress.mutateAsync({ userId: user.uid, lessonId: id, completed: !isCompleted });
    toast.success(isCompleted ? 'Marked as incomplete' : '🎉 Lesson completed!');
  };

  const handleBookmark = async () => {
    if (!user?.uid || !id) return;
    const newBookmarks = await toggleBookmark.mutateAsync({
      userId: user.uid,
      lessonId: id,
      bookmarks: user.bookmarks || [],
    });
    toast.success(newBookmarks.includes(id) ? '📌 Bookmarked!' : 'Bookmark removed');
  };

  const handleSaveNotes = async () => {
    if (!user?.uid || !id) return;
    setSavingNote(true);
    await saveProgress.mutateAsync({ userId: user.uid, lessonId: id, notes });
    setNotesTouched(false);
    toast.success('Notes saved!');
    setSavingNote(false);
  };

  // Adjacent lessons
  const currentIndex = allLessons.findIndex((l) => l.id === id);
  const prevLesson = currentIndex > 0 ? allLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < allLessons.length - 1 ? allLessons[currentIndex + 1] : null;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-screen">
          <LoadingSpinner size="xl" />
        </div>
      </Layout>
    );
  }

  if (error || !lesson) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <AlertCircle className="h-12 w-12 text-red-400" />
          <h2 className="text-xl font-semibold text-gray-800">Lesson not found</h2>
          <Button onClick={() => navigate('/dashboard')} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back to Dashboard
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-gray-500 mb-5">
          <Link to="/dashboard" className="hover:text-blue-600 transition-colors">Dashboard</Link>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[lesson.category]}`}>
            {CATEGORY_LABELS[lesson.category]}
          </span>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="text-gray-700 font-medium truncate max-w-xs">{lesson.title}</span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-4">
            {/* Video Player */}
            {/* Media tab toggle */}
            {lesson.videoUrl && lesson.spotifyUrl && (
              <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
                {(['video', 'audio'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setMediaTab(t)}
                    className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      mediaTab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {t === 'video' ? '🎬 Video' : '🎵 Audio'}
                  </button>
                ))}
              </div>
            )}

            {/* Video player */}
            {lesson.videoUrl && (!lesson.spotifyUrl || mediaTab === 'video') && (
              <div className="bg-black rounded-2xl overflow-hidden shadow-lg">
                <YouTubePlayer
                  url={lesson.videoUrl}
                  initialTime={progress?.watchedSeconds}
                  onTimeUpdate={handleTimeUpdate}
                />
              </div>
            )}

            {/* Spotify player */}
            {lesson.spotifyUrl && (!lesson.videoUrl || mediaTab === 'audio') && (
              <div className="rounded-2xl overflow-hidden shadow-lg">
                <iframe
                  src={lesson.spotifyUrl
                    .replace('open.spotify.com/', 'open.spotify.com/embed/')
                    .replace('/embed/embed/', '/embed/')}
                  width="100%"
                  height="152"
                  style={{ border: 'none' }}
                  allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                  loading="lazy"
                  title="Spotify player"
                />
              </div>
            )}

            {/* No media */}
            {!lesson.videoUrl && !lesson.spotifyUrl && (
              <div className="bg-gradient-to-br from-blue-700 to-indigo-800 rounded-2xl h-48 flex items-center justify-center">
                <div className="text-center text-white">
                  <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm opacity-70">No video for this lesson</p>
                </div>
              </div>
            )}

            {/* Title & meta */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1">
                  <h1 className="text-xl font-bold text-gray-900 leading-snug mb-1">{lesson.title}</h1>
                  {lesson.titleHebrew && (
                    <p className="text-base text-gray-600 rtl">{lesson.titleHebrew}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleBookmark}
                    className="p-2 text-gray-400 hover:text-amber-500 transition-colors rounded-lg hover:bg-amber-50"
                    title="Bookmark"
                  >
                    {isBookmarked ? (
                      <BookmarkCheck className="h-5 w-5 text-amber-500" />
                    ) : (
                      <Bookmark className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500 mb-4">
                <span className="font-medium text-gray-700">{lesson.instructor}</span>
                {lesson.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" /> {formatDuration(lesson.duration)}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5" /> {lesson.viewCount} views
                </span>
                {lesson.publishedAt && (
                  <span>{formatDate(lesson.publishedAt)}</span>
                )}
                {isCompleted && (
                  <Badge variant="success" className="flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Completed
                  </Badge>
                )}
              </div>

              <p className="text-gray-600 text-sm leading-relaxed mb-4">{lesson.description}</p>

              {lesson.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {lesson.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  variant={isCompleted ? 'secondary' : 'primary'}
                  onClick={handleMarkComplete}
                  loading={saveProgress.isPending}
                  leftIcon={<CheckCircle2 className="h-4 w-4" />}
                >
                  {isCompleted ? 'Mark as Incomplete' : 'Mark Complete'}
                </Button>
                {lesson.pdfUrl && (
                  <Button
                    variant="outline"
                    onClick={() => setShowPdf(!showPdf)}
                    leftIcon={<FileText className="h-4 w-4" />}
                  >
                    {showPdf ? 'Hide' : 'View'} PDF
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={() => setShowNotes(!showNotes)}
                  leftIcon={<StickyNote className="h-4 w-4" />}
                >
                  Notes {progress?.notes ? '(saved)' : ''}
                </Button>
              </div>
            </div>

            {/* PDF Viewer */}
            {showPdf && lesson.pdfUrl && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-gray-100">
                  <span className="font-medium text-gray-800 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-blue-600" /> Source Sheet
                  </span>
                  <a
                    href={lesson.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:underline flex items-center gap-1"
                  >
                    <Download className="h-4 w-4" /> Download
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <iframe
                  src={`${lesson.pdfUrl}#toolbar=0`}
                  className="w-full h-[600px]"
                  title="Source Sheet"
                />
              </div>
            )}

            {/* Notes */}
            {showNotes && (
              <div className="bg-white rounded-2xl border border-gray-100 p-5">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <StickyNote className="h-4 w-4 text-amber-500" /> My Notes
                </h3>
                <textarea
                  value={notes}
                  onChange={(e) => {
                    setNotesTouched(true);
                    setNotesDraft(e.target.value);
                  }}
                  rows={6}
                  placeholder="Write your notes about this lesson here…"
                  className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button onClick={handleSaveNotes} loading={savingNote} size="sm">
                    Save Notes
                  </Button>
                </div>
              </div>
            )}

            {/* Prev / Next navigation */}
            <div className="flex items-center justify-between gap-4">
              {prevLesson ? (
                <Link to={`/lesson/${prevLesson.id}`} className="flex-1">
                  <div className="flex items-center gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                    <ArrowLeft className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="text-xs text-gray-400 mb-0.5">Previous</div>
                      <div className="text-sm font-medium text-gray-700 truncate">{prevLesson.title}</div>
                    </div>
                  </div>
                </Link>
              ) : <div className="flex-1" />}
              {nextLesson ? (
                <Link to={`/lesson/${nextLesson.id}`} className="flex-1">
                  <div className="flex items-center justify-end gap-3 p-4 bg-white rounded-xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors">
                    <div className="min-w-0 text-right">
                      <div className="text-xs text-gray-400 mb-0.5">Next</div>
                      <div className="text-sm font-medium text-gray-700 truncate">{nextLesson.title}</div>
                    </div>
                    <ChevronRight className="h-5 w-5 text-gray-400 flex-shrink-0" />
                  </div>
                </Link>
              ) : <div className="flex-1" />}
            </div>
          </div>

          {/* Sidebar: other lessons in category */}
          <div className="space-y-4">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-800">
                  More in {CATEGORY_LABELS[lesson.category]}
                </h3>
              </div>
              <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
                {allLessons.length === 0 ? (
                  <p className="text-sm text-gray-400 p-4">No other lessons in this category</p>
                ) : (
                  allLessons
                    .filter((l) => l.id !== id)
                    .slice(0, 10)
                    .map((l) => (
                      <Link
                        key={l.id}
                        to={`/lesson/${l.id}`}
                        className="flex items-start gap-3 p-3 hover:bg-gray-50 transition-colors group"
                      >
                        <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                          {l.thumbnailUrl ? (
                            <img src={l.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-white/70" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors line-clamp-2 leading-snug">
                            {l.title}
                          </p>
                          {l.duration && (
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                              <Clock className="h-3 w-3" /> {formatDuration(l.duration)}
                            </p>
                          )}
                        </div>
                      </Link>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
