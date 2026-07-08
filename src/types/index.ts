export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'admin' | 'student';
  createdAt: Date;
  lastLoginAt: Date;
  streak: number;
  totalLessonsCompleted: number;
  bookmarks: string[];
}

export interface Lesson {
  id: string;
  title: string;
  titleHebrew?: string;
  description: string;
  category: LessonCategory;
  series?: string;
  instructor: string;
  videoUrl?: string;
  spotifyUrl?: string;
  audioUrl?: string;
  pdfUrl?: string;
  thumbnailUrl?: string;
  duration?: number; // in minutes
  order?: number;
  tags: string[];
  publishedAt: Date | null;
  scheduledFor?: Date | null;
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  completionCount: number;
}

export type LessonCategory =
  | 'shulchan-aruch'
  | 'gemara'
  | 'halacha'
  | 'parasha'
  | 'mussar'
  | 'machshava'
  | 'jewish-law'
  | 'holidays'
  | 'other';

export const CATEGORY_LABELS: Record<LessonCategory, string> = {
  'shulchan-aruch': 'Shulchan Aruch',
  gemara: 'Gemara',
  halacha: 'Halacha',
  parasha: 'Parasha',
  mussar: 'Mussar',
  machshava: "Machshava",
  'jewish-law': 'Jewish Law',
  holidays: 'Holidays & Moadim',
  other: 'Other',
};

export const CATEGORY_COLORS: Record<LessonCategory, string> = {
  'shulchan-aruch': 'bg-blue-100 text-blue-800',
  gemara: 'bg-purple-100 text-purple-800',
  halacha: 'bg-green-100 text-green-800',
  parasha: 'bg-amber-100 text-amber-800',
  mussar: 'bg-rose-100 text-rose-800',
  machshava: 'bg-indigo-100 text-indigo-800',
  'jewish-law': 'bg-teal-100 text-teal-800',
  holidays: 'bg-orange-100 text-orange-800',
  other: 'bg-gray-100 text-gray-800',
};

export interface Progress {
  userId: string;
  lessonId: string;
  completed: boolean;
  watchedSeconds: number;
  completedAt?: Date;
  notes: string;
  lastWatchedAt: Date;
}

export interface Note {
  id: string;
  userId: string;
  lessonId: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Series {
  id: string;
  title: string;
  titleHebrew?: string;
  description: string;
  thumbnailUrl?: string;
  category: LessonCategory;
  lessonIds: string[];
  isPublished: boolean;
  createdAt: Date;
}
