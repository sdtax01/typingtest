import { Keyboard, History, Settings2, ShieldCheck, LogIn, LogOut, Home } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { repo } from '../lib/repo';

const link = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-brand-50 text-brand-700' : 'text-ink-700 hover:bg-ink-50'}`;

export default function Layout() {
  const auth = useAuth();
  return (
    <div className="min-h-screen flex flex-col">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-3">मुख्य मजकुराकडे जा · Skip to content</a>
      <header className="no-print bg-white border-b border-ink-100 sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-2">
          <NavLink to="/" className="flex items-center gap-2 mr-2 font-bold text-ink-900">
            <span className="grid place-items-center h-8 w-8 rounded-lg bg-saffron-500 text-white font-deva text-lg" aria-hidden>अ</span>
            <span className="font-deva hidden sm:inline">मराठी टायपिंग टेस्ट</span>
          </NavLink>
          <nav aria-label="मुख्य" className="flex items-center gap-1 flex-1 overflow-x-auto">
            <NavLink to="/" end className={link}><Home size={16} aria-hidden /> <span className="hidden md:inline">मुख्यपृष्ठ</span></NavLink>
            <NavLink to="/configure" className={link}><Keyboard size={16} aria-hidden /> <span className="hidden md:inline">टेस्ट</span></NavLink>
            <NavLink to="/history" className={link}><History size={16} aria-hidden /> <span className="hidden md:inline">निकाल</span></NavLink>
            <NavLink to="/ism-setup" className={link}><Settings2 size={16} aria-hidden /> <span className="hidden md:inline">ISM V6 सेटअप</span></NavLink>
            {auth.isAdmin && <NavLink to="/admin" className={link}><ShieldCheck size={16} aria-hidden /> <span className="hidden md:inline">Admin</span></NavLink>}
          </nav>
          {auth.configured &&
            (auth.session ? (
              <button className="btn-ghost" onClick={() => auth.signOut()} aria-label="बाहेर पडा · Sign out"><LogOut size={16} aria-hidden /> <span className="hidden sm:inline">बाहेर पडा</span></button>
            ) : (
              <NavLink to="/login" className="btn-primary"><LogIn size={16} aria-hidden /> लॉगिन</NavLink>
            ))}
        </div>
      </header>
      <main id="main" className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="no-print border-t border-ink-100 bg-white text-xs text-ink-500">
        <div className="mx-auto max-w-6xl px-4 py-4 flex flex-wrap gap-x-4 gap-y-1 justify-between">
          <span>Unicode देवनागरी · ISM V6 (Typewriter) साठी तयार · Windows डेस्कटॉप ब्राउझर शिफारस</span>
          <span>{repo.mode === 'supabase' ? 'Cloud mode (Supabase)' : 'Local mode — निकाल फक्त या ब्राउझरमध्ये साठवले जातात'}</span>
        </div>
      </footer>
    </div>
  );
}
