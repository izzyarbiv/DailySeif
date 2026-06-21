import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  getDocs,
  query,
  where,
  serverTimestamp,
  increment,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Progress } from '@/types';

function fromFirestore(data: Record<string, unknown>): Progress {
  return {
    userId: data.userId as string,
    lessonId: data.lessonId as string,
    completed: (data.completed as boolean) ?? false,
    watchedSeconds: (data.watchedSeconds as number) || 0,
    completedAt: data.completedAt ? (data.completedAt as Timestamp).toDate() : undefined,
    notes: (data.notes as string) || '',
    lastWatchedAt: data.lastWatchedAt ? (data.lastWatchedAt as Timestamp).toDate() : new Date(),
  };
}

// Get progress for a specific lesson
export function useProgress(userId: string | undefined, lessonId: string | undefined) {
  return useQuery({
    queryKey: ['progress', userId, lessonId],
    enabled: !!userId && !!lessonId,
    queryFn: async () => {
      const ref = doc(db, 'progress', `${userId}_${lessonId}`);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return fromFirestore(snap.data() as Record<string, unknown>);
    },
  });
}

// Get all progress for a user
export function useUserProgress(userId: string | undefined) {
  return useQuery({
    queryKey: ['progress', userId, 'all'],
    enabled: !!userId,
    queryFn: async () => {
      const q = query(collection(db, 'progress'), where('userId', '==', userId));
      const snap = await getDocs(q);
      return snap.docs.map((d) => fromFirestore(d.data() as Record<string, unknown>));
    },
  });
}

// Save/update progress
export function useSaveProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      lessonId,
      watchedSeconds,
      completed,
      notes,
    }: {
      userId: string;
      lessonId: string;
      watchedSeconds?: number;
      completed?: boolean;
      notes?: string;
    }) => {
      const ref = doc(db, 'progress', `${userId}_${lessonId}`);
      const snap = await getDoc(ref);

      const update: Record<string, unknown> = {
        userId,
        lessonId,
        lastWatchedAt: serverTimestamp(),
      };
      if (watchedSeconds !== undefined) update.watchedSeconds = watchedSeconds;
      if (notes !== undefined) update.notes = notes;
      if (completed !== undefined) {
        update.completed = completed;
        if (completed) {
          update.completedAt = serverTimestamp();
          // increment lesson completion count
          const lessonRef = doc(db, 'lessons', lessonId);
          await updateDoc(lessonRef, { completionCount: increment(1) });
          // update user total
          const userRef = doc(db, 'users', userId);
          await updateDoc(userRef, { totalLessonsCompleted: increment(1) });
        }
      }

      if (snap.exists()) {
        await updateDoc(ref, update);
      } else {
        await setDoc(ref, { ...update, completed: false, watchedSeconds: 0, notes: '' });
      }
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['progress', vars.userId, vars.lessonId] });
      qc.invalidateQueries({ queryKey: ['progress', vars.userId, 'all'] });
    },
  });
}

// Toggle bookmark
export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      userId,
      lessonId,
      bookmarks,
    }: {
      userId: string;
      lessonId: string;
      bookmarks: string[];
    }) => {
      const userRef = doc(db, 'users', userId);
      const newBookmarks = bookmarks.includes(lessonId)
        ? bookmarks.filter((b) => b !== lessonId)
        : [...bookmarks, lessonId];
      await updateDoc(userRef, { bookmarks: newBookmarks });
      return newBookmarks;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['user'] }),
  });
}
