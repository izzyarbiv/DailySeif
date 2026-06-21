# DailySeif — R' Saks Torah Learning Platform

A full-stack Torah study platform built with React, TypeScript, Firebase, and Tailwind CSS. Students can watch video shiurim, download PDF sourcesheets, track daily progress, and bookmark lessons. Admins can upload and manage classes directly from the UI.

## ✨ Features

| Feature | Details |
|---|---|
| 🔐 Authentication | Email/password + Google Sign-In via Firebase Auth |
| 📚 Lesson Library | Browse 100+ shiurim with search & category filters |
| 🎬 Video Player | YouTube, Vimeo, direct URL — powered by react-player v3 |
| �� PDF Viewer | Inline sourcesheet viewer + download |
| ✅ Progress Tracking | Mark lessons complete, resume where you left off |
| 🔖 Bookmarks | Save lessons for later, visible in your profile |
| 📝 Notes | Per-lesson private notes, auto-saved to Firestore |
| 🔥 Daily Streak | Track consecutive learning days |
| ⬆️ Admin Upload | Drag-and-drop PDF/image upload to Firebase Storage |
| 🛡️ Admin Panel | Publish/unpublish/delete lessons, full class management |
| 📱 Responsive | Works on desktop, tablet, and mobile |
| 🚀 Deploy-ready | Firebase Hosting + Vercel both configured |

## 🚀 Quick Start

### 1. Clone and install

```bash
git clone <your-repo>
cd dailyseif-r-saks
npm install
```

### 2. Create a Firebase project

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project (e.g. `dailyseif`)
3. Enable **Authentication** → Sign-in methods: **Email/Password** + **Google**
4. Enable **Firestore Database** → Start in **production mode**
5. Enable **Storage** → Start in **production mode**
6. Go to **Project Settings** → **Your Apps** → Add a Web App → copy config

### 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in `.env.local`:

```env
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123

# Your admin email(s) — comma-separated
VITE_ADMIN_EMAILS=rabbi@example.com
```

### 4. Set Firestore & Storage security rules

**Firestore rules** (`firestore.rules`):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /lessons/{id} {
      allow read: if request.auth != null;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /progress/{docId} {
      allow read, write: if request.auth != null &&
        resource.data.userId == request.auth.uid;
    }
  }
}
```

**Storage rules** (`storage.rules`):
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /pdfs/{file} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /thumbnails/{file} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /avatars/{file} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🏗️ Project Structure

```
src/
├── components/
│   ├── auth/          ProtectedRoute
│   ├── layout/        Navbar, Layout
│   └── ui/            Button, Card, Badge, Avatar, ProgressBar, LoadingSpinner
├── contexts/
│   └── AuthContext.tsx   Firebase auth + user doc
├── hooks/
│   ├── useLessons.ts     Firestore CRUD for lessons
│   └── useProgress.ts    Progress, bookmarks
├── lib/
│   ├── firebase.ts    Firebase app init
│   └── utils.ts       Helpers (cn, formatDate, etc.)
├── pages/
│   ├── Landing.tsx    Public homepage
│   ├── SignIn.tsx     Email + Google auth
│   ├── SignUp.tsx     Registration
│   ├── Dashboard.tsx  Lesson browser
│   ├── LessonViewer.tsx  Video + PDF + notes
│   ├── Upload.tsx     Admin upload page
│   └── Profile.tsx    User stats + bookmarks
└── types/
    └── index.ts       Shared TypeScript types
```

---

## 🚀 Deploy

### Firebase Hosting

```bash
npm run build
npx firebase login
npx firebase deploy --only hosting
```

### Vercel

```bash
npm run build
npx vercel --prod
```

Set your environment variables in the Vercel dashboard under **Settings → Environment Variables**.

---

## 🔑 Making Someone an Admin

After they sign up, go to Firestore → `users` collection → find their document → change `role` to `"admin"`.

Or just add their email to `VITE_ADMIN_EMAILS` in `.env.local` before they sign up — the role is set automatically on first login.

---

## 🛠️ Tech Stack

- **React 19** + **TypeScript 6**
- **Vite 8** + **Tailwind CSS v4**
- **Firebase v11** (Auth, Firestore, Storage)
- **TanStack Query v5** (data fetching/caching)
- **react-router-dom v7**
- **react-player v3** (video)
- **react-dropzone** (file uploads)
- **react-hot-toast** (notifications)
- **lucide-react** (icons)
