import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { StoreState, LearningTrack } from '../types';

const STORAGE_KEY = 'career_execution_system_data';

const initialTracks: LearningTrack[] = [
  {
    id: 'power-bi',
    name: 'Power BI Track',
    modules: [
      { id: 'pbi-1', name: 'Power BI Service', status: 'Not Started' },
      { id: 'pbi-2', name: 'Workspaces & Roles', status: 'Not Started' },
      { id: 'pbi-3', name: 'Apps & Sharing', status: 'Not Started' },
      { id: 'pbi-4', name: 'Governance & RLS', status: 'Not Started' },
      { id: 'pbi-5', name: 'Incremental Refresh', status: 'Not Started' },
      { id: 'pbi-6', name: 'Deployment Pipelines', status: 'Not Started' },
      { id: 'pbi-7', name: 'Performance Optimization', status: 'Not Started' },
      { id: 'pbi-8', name: 'Advanced DAX', status: 'Not Started' },
      { id: 'pbi-9', name: 'PL-300 Preparation', status: 'Not Started' },
    ]
  },
  {
    id: 'sql',
    name: 'SQL Track',
    modules: [
      { id: 'sql-1', name: 'Database Fundamentals', status: 'Not Started' },
      { id: 'sql-2', name: 'Keys & Constraints', status: 'Not Started' },
      { id: 'sql-3', name: 'Relationships & Joins', status: 'Not Started' },
      { id: 'sql-4', name: 'Self Joins', status: 'Not Started' },
      { id: 'sql-5', name: 'Transactions (Commit/Rollback)', status: 'Not Started' },
      { id: 'sql-6', name: 'ACID Properties', status: 'Not Started' },
      { id: 'sql-7', name: 'Views & Stored Procedures', status: 'Not Started' },
      { id: 'sql-8', name: 'Functions & Window Functions', status: 'Not Started' },
      { id: 'sql-9', name: 'Indexes & Query Optimization', status: 'Not Started' },
    ]
  },
  {
    id: 'python',
    name: 'Python for Analytics Track',
    modules: [
      { id: 'py-1', name: 'Pandas', status: 'Not Started' },
      { id: 'py-2', name: 'NumPy (Basic)', status: 'Not Started' },
      { id: 'py-3', name: 'OpenPyXL', status: 'Not Started' },
      { id: 'py-4', name: 'Requests', status: 'Not Started' },
      { id: 'py-5', name: 'Plotly', status: 'Not Started' },
      { id: 'py-6', name: 'Data Cleaning', status: 'Not Started' },
      { id: 'py-7', name: 'API Integration', status: 'Not Started' },
      { id: 'py-8', name: 'Data Transformation', status: 'Not Started' },
    ]
  }
];

const defaultState: StoreState = {
  applications: [],
  interviews: [],
  weaknesses: [],
  studyLogs: [],
  projects: [],
  resumes: [],
  skillAssessments: [],
  settings: {
    pl300TargetDate: null
  },
  learningTracks: initialTracks
};

interface StoreContextType {
  state: StoreState;
  updateState: (newState: Partial<StoreState>) => void;
  exportData: () => void;
  importData: (jsonData: string) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<StoreState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultState, ...parsed }; // Merge to ensure new fields are present
      } catch (e) {
        console.error('Failed to parse local storage data', e);
        return defaultState;
      }
    }
    return defaultState;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const updateState = (newState: Partial<StoreState>) => {
    setState(prev => ({ ...prev, ...newState }));
  };

  const exportData = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `career_execution_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (jsonData: string) => {
    try {
      const parsed = JSON.parse(jsonData);
      setState({ ...defaultState, ...parsed });
      alert('Data imported successfully!');
    } catch (e) {
      alert('Invalid JSON data format');
    }
  };

  return (
    <StoreContext.Provider value={{ state, updateState, exportData, importData }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (!context) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
