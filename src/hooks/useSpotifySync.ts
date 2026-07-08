import { useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

export function useSpotifySync() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!isAdmin) return;

    async function sync() {
      try {
        const res = await fetch('/api/podcast-episodes');
        if (!res.ok) return;
        const { episodes } = await res.json() as {
          episodes: { id: string; name: string; description: string; audioUrl: string; durationMs: number; releaseDate: string }[]
        };
        if (!episodes?.length) return;

        // Get all existing audioUrls to avoid duplicates
        const snap = await getDocs(query(collection(db, 'lessons'), where('audioUrl', '!=', null)));
        const existingUrls = new Set(snap.docs.map(d => d.data().audioUrl as string));

        let added = 0;
        for (const ep of episodes) {
          if (existingUrls.has(ep.audioUrl)) continue;
          await addDoc(collection(db, 'lessons'), {
            title: ep.name,
            description: ep.description,
            audioUrl: ep.audioUrl,
            category: 'other',
            instructor: "R' Saks",
            tags: [],
            isPublished: true,
            duration: ep.durationMs ? Math.round(ep.durationMs / 60000) : undefined,
            publishedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            viewCount: 0,
            completionCount: 0,
          });
          added++;
        }

        if (added > 0) {
          qc.invalidateQueries({ queryKey: ['lessons'] });
          console.log(`[Podcast sync] Added ${added} new episode(s)`);
        }
      } catch (e) {
        console.error('[Podcast sync] failed:', e);
      }
    }

    sync();
  }, [isAdmin, qc]);
}
