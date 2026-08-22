import { useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  BookOpen,
  Library,
  Briefcase,
  MessageSquare,
  AlertTriangle,
  Target,
  FolderGit2,
  FileText,
  Files,
  BarChart2,
  Brain,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import './Sidebar.css';

export const Sidebar = () => {
  const navigate = useNavigate();

  // Automatic Day / Night Theme Adapter based on current time
  const getAutoTheme = (): 'day' | 'night' => {
    const saved = localStorage.getItem('ces_theme') as 'day' | 'night' | null;
    if (saved) return saved;
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  };

  const [theme, setTheme] = useState<'day' | 'night'>(getAutoTheme());

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ces_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'day' ? 'night' : 'day'));
  };

  const mainLinks = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/tracks', label: 'Learning Tracks', icon: <BookOpen size={20} /> },
    { to: '/pl300', label: 'PL-300', icon: <Target size={20} /> },
    { to: '/concept-library', label: 'Concept Library', icon: <Library size={20} /> },
    { to: '/applications', label: 'Applications', icon: <Briefcase size={20} /> },
    { to: '/interviews', label: 'Interviews', icon: <MessageSquare size={20} /> },
    { to: '/weaknesses', label: 'Weaknesses', icon: <AlertTriangle size={20} /> },
    { to: '/projects', label: 'Projects', icon: <FolderGit2 size={20} /> },
    { to: '/resumes', label: 'Resumes', icon: <FileText size={20} /> },
    { to: '/documents', label: 'Documents', icon: <Files size={20} /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart2 size={20} /> },
  ];

  const intelligenceLinks = [
    {
      to: '/decision-intelligence',
      label: 'Decision Intelligence',
      icon: <Brain size={20} />,
    },
  ];

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' }).catch(() => null);
    navigate('/login', { replace: true });
  };

  const renderLinks = (links: typeof mainLinks) =>
    links.map((link) => (
      <NavLink
        key={link.to}
        to={link.to}
        className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
      >
        {link.icon}
        <span className="sidebar-link-label">{link.label}</span>
      </NavLink>
    ));

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-brand-wrap">
          <h2 className="sidebar-title">Career Execution</h2>
          <span className="text-xs text-muted">Mission Control</span>
        </div>

        <div className="sidebar-header-actions">
          <button
            type="button"
            className="sidebar-theme-toggle"
            onClick={toggleTheme}
            title={theme === 'day' ? 'Switch to Night Mode' : 'Switch to Day Mode'}
            aria-label="Toggle Day/Night Theme"
          >
            {theme === 'day' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          <button
            className="sidebar-logout-btn btn btn-secondary"
            type="button"
            onClick={handleLogout}
            title="Logout"
            aria-label="Logout"
          >
            <LogOut size={16} />
            <span className="sidebar-logout-label">Logout</span>
          </button>
        </div>
      </div>

      <nav className="sidebar-nav">
        {renderLinks(mainLinks)}
        <div className="sidebar-section-divider">INTELLIGENCE</div>
        {renderLinks(intelligenceLinks)}
      </nav>
    </aside>
  );
};