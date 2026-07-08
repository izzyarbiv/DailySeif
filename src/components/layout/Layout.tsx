import Navbar from './Navbar';
import { useSpotifySync } from '@/hooks/useSpotifySync';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  // Auto-sync new Spotify episodes whenever an admin is on the site
  useSpotifySync();
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
