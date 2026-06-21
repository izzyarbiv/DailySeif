import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  User,
  Mail,
  Flame,
  CheckCircle2,
  BookOpen,
  Bookmark,
  Camera,
  Edit2,
} from 'lucide-react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { doc, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useLessons } from '@/hooks/useLessons';
import { useUserProgress } from '@/hooks/useProgress';
import Layout from '@/components/layout/Layout';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';
import ProgressBar from '@/components/ui/ProgressBar';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '@/types';
import { formatDate } from '@/lib/utils';
import toast from 'react-hot-toast';

export default function Profile() {
  const { user, firebaseUser, refreshUser } = useAuth();
  const { data: lessons = [] } = useLessons();
  const { data: progressList = [] } = useUserProgress(user?.uid);

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const completedIds = new Set(progressList.filter((p) => p.completed).map((p) => p.lessonId));
  const bookmarkedLessons = lessons.filter((l) => user?.bookmarks?.includes(l.id));
  const completedLessons = lessons.filter((l) => completedIds.has(l.id));

  const categoryStats = Object.entries(CATEGORY_LABELS).map(([key, label]) => {
    const total = lessons.filter((l) => l.category === key).length;
    const done = lessons.filter((l) => l.category === key && completedIds.has(l.id)).length;
    return { key, label, total, done };
  }).filter((c) => c.total > 0);

  const handleSaveName = async () => {
    if (!firebaseUser || !user || !newName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(firebaseUser, { displayName: newName.trim() });
      await updateDoc(doc(db, 'users', user.uid), { displayName: newName.trim() });
      await refreshUser();
      setEditingName(false);
      toast.success('Name updated!');
    } catch {
      toast.error('Failed to update name');
    } finally {
      setSavingName(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !firebaseUser || !user) return;
    setUploadingAvatar(true);
    try {
      const path = `avatars/${user.uid}_${Date.now()}`;
      const ref = storageRef(storage, path);
      const task = uploadBytesResumable(ref, file);
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed', undefined, reject, resolve);
      });
      const url = await getDownloadURL(task.snapshot.ref);
      await updateProfile(firebaseUser, { photoURL: url });
      await updateDoc(doc(db, 'users', user.uid), { photoURL: url });
      await refreshUser();
      toast.success('Avatar updated!');
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  if (!user) return null;

  return (
    <Layout>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Profile card */}
          <div className="md:col-span-1 space-y-4">
            <Card padding="lg">
              <div className="flex flex-col items-center text-center">
                {/* Avatar with upload */}
                <div className="relative mb-4">
                  <Avatar src={user.photoURL} name={user.displayName} size="xl" />
                  <label
                    htmlFor="avatar-upload"
                    className={`absolute bottom-0 right-0 h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center cursor-pointer shadow-md hover:bg-blue-700 transition-colors ${uploadingAvatar ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {uploadingAvatar ? (
                      <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4 text-white" />
                    )}
                  </label>
                  <input
                    id="avatar-upload"
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={handleAvatarUpload}
                    disabled={uploadingAvatar}
                  />
                </div>

                {/* Name editing */}
                {editingName ? (
                  <div className="w-full space-y-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="w-full text-center border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button size="sm" fullWidth loading={savingName} onClick={handleSaveName}>Save</Button>
                      <Button size="sm" variant="ghost" fullWidth onClick={() => { setEditingName(false); setNewName(user.displayName || ''); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 mb-1">
                    <h2 className="font-bold text-gray-900 text-lg">{user.displayName || 'Student'}</h2>
                    <button onClick={() => setEditingName(true)} className="text-gray-400 hover:text-blue-600">
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                  <Mail className="h-3.5 w-3.5" />
                  <span className="truncate">{user.email}</span>
                </div>

                {user.role === 'admin' && (
                  <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-700 text-xs px-2.5 py-1 rounded-full font-medium mb-3">
                    ⭐ Admin
                  </span>
                )}

                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <User className="h-3 w-3" />
                  Member since {formatDate(user.createdAt)}
                </div>
              </div>
            </Card>

            {/* Stats */}
            <Card padding="md">
              <h3 className="font-semibold text-gray-800 mb-4">Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Flame className="h-4 w-4 text-orange-500" />
                    Day streak
                  </div>
                  <span className="font-bold text-gray-900">{user.streak}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Completed
                  </div>
                  <span className="font-bold text-gray-900">{completedIds.size}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    Available
                  </div>
                  <span className="font-bold text-gray-900">{lessons.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Bookmark className="h-4 w-4 text-purple-500" />
                    Bookmarked
                  </div>
                  <span className="font-bold text-gray-900">{bookmarkedLessons.length}</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Right column */}
          <div className="md:col-span-2 space-y-5">
            {/* Progress by category */}
            {categoryStats.length > 0 && (
              <Card padding="md">
                <h3 className="font-semibold text-gray-800 mb-4">Progress by Topic</h3>
                <div className="space-y-4">
                  {categoryStats.map(({ key, label, total, done }) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[key as keyof typeof CATEGORY_COLORS]}`}>
                          {label}
                        </span>
                        <span className="text-gray-500 text-xs">{done}/{total}</span>
                      </div>
                      <ProgressBar value={done} max={total} size="md" color="blue" />
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Bookmarks */}
            <Card padding="md">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Bookmark className="h-4 w-4 text-purple-500" /> Bookmarks
              </h3>
              {bookmarkedLessons.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No bookmarks yet</p>
              ) : (
                <div className="space-y-2">
                  {bookmarkedLessons.map((l) => (
                    <Link
                      key={l.id}
                      to={`/lesson/${l.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden">
                        {l.thumbnailUrl ? (
                          <img src={l.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <BookOpen className="h-4 w-4 text-white/70" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">{l.title}</p>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${CATEGORY_COLORS[l.category]}`}>
                          {CATEGORY_LABELS[l.category]}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            {/* Completed lessons */}
            <Card padding="md">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" /> Completed Lessons
              </h3>
              {completedLessons.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No completed lessons yet. <Link to="/dashboard" className="text-blue-600 hover:underline">Start learning!</Link></p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {completedLessons.map((l) => (
                    <Link
                      key={l.id}
                      to={`/lesson/${l.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors group"
                    >
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800 group-hover:text-blue-700 transition-colors truncate">{l.title}</p>
                      </div>
                      <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${CATEGORY_COLORS[l.category]}`}>
                        {CATEGORY_LABELS[l.category]}
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
