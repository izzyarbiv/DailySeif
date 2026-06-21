import { Link } from 'react-router-dom';
import {
  BookOpen,
  Play,
  FileText,
  TrendingUp,
  Bell,
  Users,
  Star,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import Button from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  {
    icon: Play,
    title: 'Video Shiurim',
    description: 'Watch high-quality video classes from R\' Saks with clear explanations and practical guidance.',
    color: 'bg-blue-100 text-blue-700',
  },
  {
    icon: FileText,
    title: 'PDF Sourcesheets',
    description: 'Download and follow along with detailed source sheets for every class.',
    color: 'bg-indigo-100 text-indigo-700',
  },
  {
    icon: TrendingUp,
    title: 'Track Progress',
    description: 'Monitor your daily streak, completed lessons, and learning milestones.',
    color: 'bg-green-100 text-green-700',
  },
  {
    icon: Bell,
    title: 'Daily Reminders',
    description: 'Stay consistent with your learning through smart daily reminder notifications.',
    color: 'bg-amber-100 text-amber-700',
  },
  {
    icon: BookOpen,
    title: 'Organized Curriculum',
    description: 'Classes organized by topic: Halacha, Gemara, Parasha, Machshava, and more.',
    color: 'bg-purple-100 text-purple-700',
  },
  {
    icon: Users,
    title: 'Learning Community',
    description: 'Join a community of learners growing together in Torah knowledge.',
    color: 'bg-rose-100 text-rose-700',
  },
];

const categories = [
  { name: 'Shulchan Aruch', hebrew: 'שולחן ערוך', count: '40+ classes', color: 'from-blue-500 to-blue-700' },
  { name: 'Gemara', hebrew: 'גמרא', count: '25+ classes', color: 'from-purple-500 to-purple-700' },
  { name: 'Halacha', hebrew: 'הלכה', count: '35+ classes', color: 'from-green-500 to-green-700' },
  { name: 'Parasha', hebrew: 'פרשה', count: '52+ classes', color: 'from-amber-500 to-amber-700' },
];

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-gray-900 text-lg">DailySeif</span>
              <span className="block text-xs text-gray-500 leading-none">R' Saks</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {user ? (
              <Link to="/dashboard">
                <Button>Go to Dashboard <ChevronRight className="h-4 w-4" /></Button>
              </Link>
            ) : (
              <>
                <Link to="/signin"><Button variant="ghost" size="sm">Sign In</Button></Link>
                <Link to="/signup"><Button size="sm">Get Started Free</Button></Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-hero pt-32 pb-24 relative overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-10 -right-20 text-[200px] font-bold text-white/5 select-none leading-none">ס</div>
          <div className="absolute bottom-0 -left-10 text-[180px] font-bold text-white/5 select-none leading-none">ת</div>
        </div>
        <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 rounded-full px-4 py-1.5 text-sm font-medium mb-6 backdrop-blur-sm border border-white/20">
            <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
            Daily Torah Learning — Accessible Anywhere
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6">
            Learn Torah Daily
            <br />
            <span className="text-amber-400">with R' Saks</span>
          </h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-10 leading-relaxed">
            Access hundreds of shiurim in Halacha, Gemara, Parasha and more. Track your progress, download sourcesheets, and grow every day.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/signup">
              <Button size="xl" variant="gold" rightIcon={<ChevronRight className="h-5 w-5" />}>
                Start Learning Free
              </Button>
            </Link>
            <Link to="/signin">
              <Button size="xl" variant="ghost" className="text-white hover:bg-white/10 hover:text-white border border-white/30">
                Sign In
              </Button>
            </Link>
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-6 text-sm text-blue-200">
            {['✓ Free to join', '✓ 100+ shiurim', '✓ PDF downloads', '✓ Track progress'].map((f) => (
              <span key={f}>{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { num: '100+', label: 'Shiurim', sub: 'and growing' },
            { num: '5,000+', label: 'Students', sub: 'learning daily' },
            { num: '4', label: 'Categories', sub: 'of learning' },
            { num: 'Free', label: 'Access', sub: 'no credit card' },
          ].map(({ num, label, sub }) => (
            <div key={label}>
              <div className="text-3xl font-extrabold text-blue-700">{num}</div>
              <div className="font-semibold text-gray-900">{label}</div>
              <div className="text-sm text-gray-500">{sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Topics Covered</h2>
            <p className="text-gray-500">Comprehensive Torah learning across major areas of study</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map(({ name, hebrew, count, color }) => (
              <Link
                key={name}
                to="/signup"
                className={`bg-gradient-to-br ${color} rounded-2xl p-6 text-white text-center card-hover group`}
              >
                <div className="text-3xl font-bold mb-1 opacity-60">{hebrew}</div>
                <div className="font-bold text-lg">{name}</div>
                <div className="text-sm opacity-80 mt-1">{count}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-white">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Everything You Need to Learn</h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              A complete platform built specifically for Torah study, with all the tools to make learning easy and consistent.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map(({ icon: Icon, title, description, color }) => (
              <div key={title} className="bg-gray-50 rounded-2xl p-6 card-hover">
                <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-4 ${color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">How It Works</h2>
            <p className="text-gray-500">Simple, intuitive, and designed for consistent learning</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create your account', desc: 'Sign up free in 30 seconds with Google or email. No credit card required.' },
              { step: '02', title: 'Browse shiurim', desc: 'Explore classes by category, search by topic, or follow the curriculum in order.' },
              { step: '03', title: 'Learn & track', desc: 'Watch videos, download PDFs, take notes, and track your progress over time.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-center">
                <div className="h-14 w-14 bg-blue-600 text-white rounded-2xl flex items-center justify-center text-xl font-extrabold mx-auto mb-4 shadow-lg shadow-blue-200">
                  {step}
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-gradient-hero relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 right-0 text-[250px] font-bold text-white/5 select-none">ל</div>
        </div>
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <div className="flex justify-center mb-6">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-6 w-6 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Ready to start your daily learning?
          </h2>
          <p className="text-blue-200 text-lg mb-10">
            Join thousands of students learning with R' Saks every day.
          </p>
          <Link to="/signup">
            <Button size="xl" variant="gold" rightIcon={<ChevronRight className="h-5 w-5" />}>
              Start Learning Now — It's Free
            </Button>
          </Link>
          <div className="mt-8 flex flex-wrap justify-center gap-4 text-sm text-blue-200">
            {[
              <><CheckCircle2 className="h-4 w-4" /> Free forever</>,
              <><CheckCircle2 className="h-4 w-4" /> No ads</>,
              <><CheckCircle2 className="h-4 w-4" /> New classes weekly</>,
            ].map((item, i) => (
              <span key={i} className="flex items-center gap-1.5">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-white" />
            </div>
            <span className="text-white font-semibold">DailySeif — R' Saks</span>
          </div>
          <p className="text-sm">© {new Date().getFullYear()} DailySeif. Built for Torah learning.</p>
          <div className="flex gap-4 text-sm">
            <Link to="/signin" className="hover:text-white transition-colors">Sign In</Link>
            <Link to="/signup" className="hover:text-white transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
