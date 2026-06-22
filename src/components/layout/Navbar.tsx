import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Menu,
  X,
  User,
  LogOut,
  Upload,
  LayoutDashboard,
  ChevronDown,
  Star,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Avatar from '@/components/ui/Avatar';
import Button from '@/components/ui/Button';

export default function Navbar() {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setDropdownOpen(false);
  };

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ...(isAdmin ? [{ to: '/upload', label: 'Upload Class', icon: Upload }] : []),
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 glass border-b border-[#e1e7ef] shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 bg-gradient-to-br from-[#17365f] to-[#2a5688] rounded-xl flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <BookOpen className="h-5 w-5 text-white" />
            </div>
            <div className="leading-tight">
              <span className="font-bold text-gray-900 text-lg">DailySeif</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-1">
            {user &&
              navLinks.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    location.pathname.startsWith(to)
                      ? 'bg-[#e9f1fb] text-[#1c3d6e]'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-[#f2f4f8]'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </Link>
              ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-[#f2f4f8] transition-colors"
                >
                  <Avatar src={user.photoURL} name={user.displayName} size="sm" />
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900 leading-tight max-w-[120px] truncate">
                      {user.displayName || 'Student'}
                    </p>
                    {isAdmin && (
                      <span className="text-xs text-[#1c3d6e] font-medium flex items-center gap-0.5">
                        <Star className="h-3 w-3" /> Admin
                      </span>
                    )}
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                    <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-[#e1e7ef] py-1 z-20">
                      <div className="px-4 py-3 border-b border-[#e1e7ef]">
                        <p className="text-sm font-semibold text-gray-900 truncate">{user.displayName}</p>
                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                      </div>
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-700 hover:bg-[#f2f4f8] transition-colors"
                      >
                        <User className="h-4 w-4" /> My Profile
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/upload"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#1c3d6e] hover:bg-[#e9f1fb] transition-colors"
                        >
                          <Upload className="h-4 w-4" /> Upload Class
                        </Link>
                      )}
                      <hr className="my-1 border-gray-100" />
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut className="h-4 w-4" /> Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/signin">
                  <Button variant="ghost" size="sm" className="text-gray-700 hover:bg-[#f2f4f8]">Sign In</Button>
                </Link>
                <Link to="/signup">
                    <Button size="sm" className="bg-[#1c3d6e] hover:bg-[#16345e] active:bg-[#122b4d] focus:ring-[#1c3d6e]">Get Started</Button>
                </Link>
              </div>
            )}

            {/* Mobile menu toggle */}
            {user && (
              <button
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100"
                onClick={() => setMobileOpen(!mobileOpen)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && user && (
        <div className="md:hidden border-t border-gray-200 bg-white px-4 py-2 space-y-1">
          {navLinks.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                location.pathname.startsWith(to)
                  ? 'bg-[#e9f1fb] text-[#1c3d6e]'
                  : 'text-gray-700 hover:bg-[#f2f4f8]'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
