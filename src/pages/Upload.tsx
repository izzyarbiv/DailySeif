import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  FileText,
  Image,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateLesson, useAllLessons, useDeleteLesson, useUpdateLesson } from '@/hooks/useLessons';
import Layout from '@/components/layout/Layout';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { CATEGORY_LABELS, type LessonCategory } from '@/types';
import { formatDate, truncate } from '@/lib/utils';
import toast from 'react-hot-toast';

interface UploadState {
  progress: number;
  status: 'idle' | 'uploading' | 'done' | 'error';
  url?: string;
}

function FileDropzone({
  label,
  accept,
  onUploaded,
  folder,
  icon: Icon,
}: {
  label: string;
  accept: Record<string, string[]>;
  onUploaded: (url: string) => void;
  folder: string;
  icon: React.ElementType;
}) {
  const [upload, setUpload] = useState<UploadState>({ progress: 0, status: 'idle' });

  const onDrop = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;
      setUpload({ progress: 0, status: 'uploading' });
      const path = `${folder}/${Date.now()}_${file.name}`;
      const ref = storageRef(storage, path);
      const task = uploadBytesResumable(ref, file);
      task.on(
        'state_changed',
        (snap) => setUpload((u) => ({ ...u, progress: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) })),
        () => {
          setUpload({ progress: 0, status: 'error' });
          toast.error('Upload failed');
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          setUpload({ progress: 100, status: 'done', url });
          onUploaded(url);
          toast.success(`${label} uploaded!`);
        }
      );
    },
    [folder, label, onUploaded]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept, maxFiles: 1 });

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
      {upload.status === 'done' ? (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">Uploaded successfully</span>
          <button onClick={() => setUpload({ progress: 0, status: 'idle' })} className="ml-auto text-green-500 hover:text-green-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : upload.status === 'uploading' ? (
        <div className="p-4 border border-blue-200 rounded-xl bg-blue-50">
          <div className="flex items-center gap-2 text-sm text-blue-700 mb-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Uploading… {upload.progress}%
          </div>
          <div className="h-2 bg-blue-200 rounded-full">
            <div className="h-2 bg-blue-600 rounded-full transition-all" style={{ width: `${upload.progress}%` }} />
          </div>
        </div>
      ) : (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          } ${upload.status === 'error' ? 'border-red-300 bg-red-50' : ''}`}
        >
          <input {...getInputProps()} />
          <Icon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            {isDragActive ? 'Drop here…' : 'Drag & drop or click to browse'}
          </p>
          {upload.status === 'error' && (
            <p className="text-xs text-red-500 mt-1 flex items-center justify-center gap-1">
              <AlertCircle className="h-3 w-3" /> Upload failed. Try again.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function UploadClass() {
  const { user } = useAuth();
  const createLesson = useCreateLesson();
  const deleteLesson = useDeleteLesson();
  const updateLesson = useUpdateLesson();
  const { data: allLessons = [], isLoading: loadingLessons } = useAllLessons();

  const [form, setForm] = useState({
    title: '',
    titleHebrew: '',
    description: '',
    category: 'shulchan-aruch' as LessonCategory,
    series: '',
    instructor: "R' Saks",
    videoUrl: '',
    pdfUrl: '',
    thumbnailUrl: '',
    duration: '',
    tags: '',
    isPublished: true,
    order: '',
  });

  const handleChange = (field: string, value: string | boolean) => {
    setForm((f) => ({ ...f, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }

    try {
      await createLesson.mutateAsync({
        title: form.title.trim(),
        titleHebrew: form.titleHebrew.trim() || undefined,
        description: form.description.trim(),
        category: form.category,
        series: form.series.trim() || undefined,
        instructor: form.instructor.trim(),
        videoUrl: form.videoUrl.trim() || undefined,
        pdfUrl: form.pdfUrl.trim() || undefined,
        thumbnailUrl: form.thumbnailUrl.trim() || undefined,
        duration: form.duration ? parseInt(form.duration) : undefined,
        order: form.order ? parseInt(form.order) : undefined,
        tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        isPublished: form.isPublished,
        publishedAt: form.isPublished ? new Date() : null,
      });
      toast.success('✅ Class uploaded successfully!');
      setForm({
        title: '', titleHebrew: '', description: '',
        category: 'shulchan-aruch', series: '', instructor: "R' Saks",
        videoUrl: '', pdfUrl: '', thumbnailUrl: '', duration: '', tags: '',
        isPublished: true, order: '',
      });
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code.includes('permission-denied')) {
        toast.error('Permission denied. Sign out/in after setting your account as admin.');
      } else {
        toast.error('Upload failed. Please try again.');
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class permanently?')) return;
    await deleteLesson.mutateAsync(id);
    toast.success('Class deleted');
  };

  const togglePublish = async (id: string, current: boolean) => {
    await updateLesson.mutateAsync({ id, data: { isPublished: !current, publishedAt: !current ? new Date() : null } });
    toast.success(!current ? 'Published!' : 'Unpublished');
  };

  if (!user || user.role !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center min-h-screen gap-3">
          <AlertCircle className="h-10 w-10 text-red-400" />
          <p className="text-lg font-semibold text-gray-700">Admin access required</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Upload a Class</h1>
          <p className="text-gray-500 mt-1">Add a new shiur to the library</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-8">
          {/* Upload form */}
          <div className="lg:col-span-3">
            <Card padding="lg">
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* Basic info */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title (English) *</label>
                    <input
                      type="text"
                      value={form.title}
                      onChange={(e) => handleChange('title', e.target.value)}
                      required
                      placeholder="e.g. Hilchos Shabbos – Melachos"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Title (Hebrew)</label>
                    <input
                      type="text"
                      value={form.titleHebrew}
                      onChange={(e) => handleChange('titleHebrew', e.target.value)}
                      placeholder="כותרת בעברית"
                      dir="rtl"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Instructor</label>
                    <input
                      type="text"
                      value={form.instructor}
                      onChange={(e) => handleChange('instructor', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    rows={3}
                    placeholder="What will students learn in this class?"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>

                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) => handleChange('category', e.target.value)}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Duration (min)</label>
                    <input
                      type="number"
                      value={form.duration}
                      onChange={(e) => handleChange('duration', e.target.value)}
                      placeholder="45"
                      min="1"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Order #</label>
                    <input
                      type="number"
                      value={form.order}
                      onChange={(e) => handleChange('order', e.target.value)}
                      placeholder="1"
                      min="1"
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Series / Topic</label>
                  <input
                    type="text"
                    value={form.series}
                    onChange={(e) => handleChange('series', e.target.value)}
                    placeholder="e.g. Orach Chaim Volume 1"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={form.tags}
                    onChange={(e) => handleChange('tags', e.target.value)}
                    placeholder="shabbos, mitzva, halacha"
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Video URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Video URL (YouTube / Vimeo / direct)</label>
                  <input
                    type="url"
                    value={form.videoUrl}
                    onChange={(e) => handleChange('videoUrl', e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* PDF upload */}
                <FileDropzone
                  label="PDF Sourcesheet"
                  accept={{ 'application/pdf': ['.pdf'] }}
                  onUploaded={(url) => handleChange('pdfUrl', url)}
                  folder="pdfs"
                  icon={FileText}
                />
                {form.pdfUrl && (
                  <input type="hidden" value={form.pdfUrl} />
                )}

                {/* Thumbnail upload */}
                <FileDropzone
                  label="Thumbnail Image"
                  accept={{ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] }}
                  onUploaded={(url) => handleChange('thumbnailUrl', url)}
                  folder="thumbnails"
                  icon={Image}
                />

                {/* Publish toggle */}
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    id="isPublished"
                    checked={form.isPublished}
                    onChange={(e) => handleChange('isPublished', e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isPublished" className="text-sm text-gray-700">
                    <span className="font-medium">Publish immediately</span>
                    <span className="text-gray-500 ml-1">(uncheck to save as draft)</span>
                  </label>
                </div>

                <Button
                  type="submit"
                  fullWidth
                  size="lg"
                  loading={createLesson.isPending}
                  leftIcon={<Upload className="h-4 w-4" />}
                >
                  {form.isPublished ? 'Publish Class' : 'Save as Draft'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Existing lessons */}
          <div className="lg:col-span-2">
            <Card padding="none" className="overflow-hidden">
              <div className="p-4 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900">Manage Classes</h2>
                <p className="text-xs text-gray-500 mt-0.5">{allLessons.length} total</p>
              </div>
              <div className="divide-y divide-gray-50 max-h-[600px] overflow-y-auto">
                {loadingLessons ? (
                  <div className="flex justify-center p-8">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full" />
                  </div>
                ) : allLessons.length === 0 ? (
                  <p className="text-sm text-gray-400 p-6 text-center">No classes yet</p>
                ) : (
                  allLessons.map((lesson) => (
                    <div key={lesson.id} className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{lesson.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">
                            {CATEGORY_LABELS[lesson.category]} · {formatDate(lesson.createdAt)}
                          </p>
                          {lesson.description && (
                            <p className="text-xs text-gray-500 mt-0.5">{truncate(lesson.description, 60)}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                          <Badge variant={lesson.isPublished ? 'success' : 'warning'}>
                            {lesson.isPublished ? 'Published' : 'Draft'}
                          </Badge>
                          <div className="flex gap-1">
                            <button
                              onClick={() => togglePublish(lesson.id, lesson.isPublished)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {lesson.isPublished ? 'Unpublish' : 'Publish'}
                            </button>
                            <span className="text-gray-300">·</span>
                            <button
                              onClick={() => handleDelete(lesson.id)}
                              className="text-xs text-red-500 hover:underline"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
