
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  BookOpen, 
  Briefcase, 
  MessageSquare, 
  AlertTriangle, 
  Target, 
  FolderGit2, 
  FileText,
  BarChart2
} from 'lucide-react';
import './Sidebar.css';

export const Sidebar = () => {
  const links = [
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { to: '/tracks', label: 'Learning Tracks', icon: <BookOpen size={20} /> },
    { to: '/applications', label: 'Applications', icon: <Briefcase size={20} /> },
    { to: '/interviews', label: 'Interviews', icon: <MessageSquare size={20} /> },
    { to: '/weaknesses', label: 'Weaknesses', icon: <AlertTriangle size={20} /> },
    { to: '/pl300', label: 'PL-300', icon: <Target size={20} /> },
    { to: '/projects', label: 'Projects', icon: <FolderGit2 size={20} /> },
    { to: '/resumes', label: 'Resumes', icon: <FileText size={20} /> },
    { to: '/analytics', label: 'Analytics', icon: <BarChart2 size={20} /> },
  ];

  return (
    <aside className="sidebar">
      <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)' }}>
        <h2 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--accent-primary)' }}>Career Execution</h2>
        <span className="text-xs text-muted">Mission Control</span>
      </div>
      <nav style={{ flex: 1, padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.25rem', overflowY: 'auto' }}>
        {links.map((link) => (
          <NavLink 
            key={link.to} 
            to={link.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.75rem', 
              padding: '0.75rem 1.5rem',
              color: 'var(--text-main)',
              textDecoration: 'none',
              transition: 'background-color 0.2s ease'
            }}
          >
            {link.icon}
            <span style={{ fontWeight: 500 }}>{link.label}</span>
          </NavLink>
        ))}
      </nav>
      <div style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
        <p style={{ marginBottom: '0.5rem' }}>Stay focused. Execute.</p>
        <p style={{ color: 'var(--warning)', fontWeight: 600 }}>Priority: Employment</p>
      </div>
    </aside>
  );
};
