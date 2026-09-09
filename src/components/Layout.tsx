
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { InteractiveBackground } from './InteractiveBackground';

export const Layout = () => {
  return (
    <div className="app-container">
      <InteractiveBackground />
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};
