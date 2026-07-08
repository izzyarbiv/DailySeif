import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Lesson, LessonCategory } from '@/types';

function stripUndefined(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

function fromFirestore(data: Record<string, unknown>, id: string): Lesson {
  return {
    id,
    title: (data.title as string) || '',
    titleHebrew: data.titleHebrew as string | undefined,
    description: (data.description as string) || '',
    category: (data.category as LessonCategory) || 'other',
    series: data.series as string | undefined,
    instructor: (data.instructor as string) || '',
    videoUrl: data.videoUrl as string | undefined,
    spotifyUrl: data.spotifyUrl as string | undefined,
    audioUrl: data.audioUrl as string | undefined,
    pdfUrl: data.pdfUrl as string | undefined,
    thumbnailUrl: data.thumbnailUrl as string | undefined,
    duration: data.duration as number | undefined,
    order: data.order as number | undefined,
    tags: (data.tags as string[]) || [],
    publishedAt: data.publishedAt ? (data.publishedAt as Timestamp).toDate() : null,
    scheduledFor: data.scheduledFor ? (data.scheduledFor as Timestamp).toDate() : null,
    isPublished: (data.isPublished as boolean) ?? false,
    createdAt: data.createdAt ? (data.createdAt as Timestamp).toDate() : new Date(),
    updatedAt: data.updatedAt ? (data.updatedAt as Timestamp).toDate() : new Date(),
    viewCount: (data.viewCount as number) || 0,
    completionCount: (data.completionCount as number) || 0,
  };
}

// Fetch all published lessons
export function useLessons(category?: LessonCategory, searchTerm?: string) {
  return useQuery({
    queryKey: ['lessons', category, searchTerm],
    queryFn: async () => {
      const constraints = [
        where('isPublished', '==', true),
        orderBy('createdAt', 'desc'),
      ];
      if (category) constraints.splice(1, 0, where('category', '==', category));

      const q = query(collection(db, 'lessons'), ...constraints);
      const snap = await getDocs(q);
      const lessons = snap.docs.map((d) => fromFirestore(d.data() as Record<string, unknown>, d.id));

      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        return lessons.filter(
          (l) =>
            l.title.toLowerCase().includes(lower) ||
            l.description.toLowerCase().includes(lower) ||
            l.tags.some((t) => t.toLowerCase().includes(lower))
        );
      }

      return lessons;
    },
    staleTime: 1000 * 60 * 5, // 5 min
  });
}

// Fetch ALL lessons (admin)
export function useAllLessons() {
  return useQuery({
    queryKey: ['lessons', 'all'],
    queryFn: async () => {
      const q = query(collection(db, 'lessons'), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs
        .filter((d) => !d.data().removed)
        .map((d) => fromFirestore(d.data() as Record<string, unknown>, d.id));
    },
  });
}

// Fetch single lesson
export function useLesson(id: string | undefined) {
  return useQuery({
    queryKey: ['lesson', id],
    enabled: !!id,
    queryFn: async () => {
      const snap = await getDoc(doc(db, 'lessons', id!));
      if (!snap.exists()) throw new Error('Lesson not found');
      // Best-effort view count — non-admins can't write, so swallow the error
      updateDoc(doc(db, 'lessons', id!), { viewCount: increment(1) }).catch(() => {});
      return fromFirestore(snap.data() as Record<string, unknown>, snap.id);
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Create lesson
export function useCreateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt' | 'viewCount' | 'completionCount'>) => {
      const ref = await addDoc(collection(db, 'lessons'), {
        ...stripUndefined(data as unknown as Record<string, unknown>),
        viewCount: 0,
        completionCount: 0,
        publishedAt: data.isPublished ? serverTimestamp() : null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return ref.id;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}

// Update lesson
export function useUpdateLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Lesson> }) => {
      await updateDoc(doc(db, 'lessons', id), {
        ...stripUndefined(data as unknown as Record<string, unknown>),
        updatedAt: serverTimestamp(),
      });
    },
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['lessons'] });
      qc.invalidateQueries({ queryKey: ['lesson', id] });
    },
  });
}

// Delete lesson
// Auto-synced Spotify lessons are replaced with a hidden tombstone
// ({spotifyUrl, removed}) instead of deleted outright — otherwise the
// Spotify sync would re-import the episode on the next admin visit.
export function useDeleteLesson() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const ref = doc(db, 'lessons', id);
      const snap = await getDoc(ref);
      const spotifyUrl = snap.exists() ? (snap.data().spotifyUrl as string | undefined) : undefined;
      if (spotifyUrl) {
        await setDoc(ref, {
          spotifyUrl,
          removed: true,
          isPublished: false,
          updatedAt: serverTimestamp(),
        });
      } else {
        await deleteDoc(ref);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['lessons'] }),
  });
}
