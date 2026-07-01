
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Layout } from './components/Layout';

// Views
import { Dashboard } from './views/Dashboard';
import { LearningTracks } from './views/LearningTracks';
import { Applications } from './views/Applications';
import { Interviews } from './views/Interviews';
import { Weaknesses } from './views/Weaknesses';
import { PL300Tracker } from './views/PL300Tracker';
import { ProjectTracker } from './views/ProjectTracker';
import { ResumeTracker } from './views/ResumeTracker';
import { Analytics } from './views/Analytics';

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="tracks" element={<LearningTracks />} />
            <Route path="applications" element={<Applications />} />
            <Route path="interviews" element={<Interviews />} />
            <Route path="weaknesses" element={<Weaknesses />} />
            <Route path="pl300" element={<PL300Tracker />} />
            <Route path="projects" element={<ProjectTracker />} />
            <Route path="resumes" element={<ResumeTracker />} />
            <Route path="analytics" element={<Analytics />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
