import Navbar from './Navbar';

interface Props {
  children: React.ReactNode;
}

export default function Layout({ children }: Props) {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
