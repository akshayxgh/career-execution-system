
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { InteractiveBackground } from './InteractiveBackground';
import { CommandPalette } from './CommandPalette';

export const Layout = () => {
  return (
    <div className="app-container">
      <InteractiveBackground />
      <CommandPalette />
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
