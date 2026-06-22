import type { StoreState } from '../types';
import { differenceInDays, isSameWeek } from 'date-fns';

export const calculateExecutionScore = (state: StoreState): number => {
  // A simplistic score out of 100 based on recent activity (e.g., this week)
  // 1. Applications Sent (25%) - target: 5 per week -> 5 points each
  const appsThisWeek = state.applications.filter(app => 
    isSameWeek(new Date(app.appliedDate), new Date()) && app.status !== 'Saved'
  ).length;
  const appScore = Math.min(25, appsThisWeek * 5);

  // 2. Interviews Attended (20%) - target: 1 per week -> 20 points
  const interviewsThisWeek = state.interviews.filter(i => 
    isSameWeek(new Date(i.date), new Date())
  ).length;
  const interviewScore = Math.min(20, interviewsThisWeek * 20);

  // 3. Weaknesses Fixed (15%) - target: 2 per week -> 7.5 points each
  const fixedWeaknesses = state.weaknesses.filter(w => w.status === 'Fixed' || w.status === 'Mastered').length;
  const weaknessScore = Math.min(15, fixedWeaknesses * 7.5); // Cumulative for simplicity or could be weekly

  // 4. Certification Progress (15%) - based on modules completed in PL-300 track
   // Assuming we track PL-300 within Power BI or separately
  
  // Since we don't have a specific track yet, let's just base it on overall track progress
  const totalModules = state.learningTracks.flatMap(t => t.modules).length;
  const completedModules = state.learningTracks.flatMap(t => t.modules).filter(m => m.status === 'Mastered').length;
  const certScore = totalModules === 0 ? 0 : Math.min(15, (completedModules / totalModules) * 15);

  // 5. Projects Completed (10%) - target: 1 project -> 10 points
  const completedProjects = state.projects.filter(p => p.status === 'Completed' || p.status === 'Published').length;
  const projectScore = Math.min(10, completedProjects * 10);

  // 6. Study Consistency (10%) - target: 5 days this week -> 2 points per day
  const studyDaysThisWeek = new Set(
    state.studyLogs
      .filter(l => isSameWeek(new Date(l.date), new Date()))
      .map(l => l.date)
  ).size;
  const consistencyScore = Math.min(10, studyDaysThisWeek * 2);

  // 7. Study Hours (5%) - target: 20 hours this week -> 0.25 points per hour
  const hoursThisWeek = state.studyLogs
    .filter(l => isSameWeek(new Date(l.date), new Date()))
    .reduce((sum, log) => sum + log.actualHours, 0);
  const hoursScore = Math.min(5, hoursThisWeek * 0.25);

  return Math.round(appScore + interviewScore + weaknessScore + certScore + projectScore + consistencyScore + hoursScore);
};

export const getStreak = (state: StoreState): number => {
  if (state.studyLogs.length === 0) return 0;
  
  const dates = [...new Set(state.studyLogs.map(l => l.date))].sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  let streak = 0;
  let currentDate = new Date();

  for (let i = 0; i < dates.length; i++) {
    const logDate = new Date(dates[i]);
    const diff = differenceInDays(currentDate, logDate);
    
    if (diff === 0 || diff === 1) {
      streak++;
      currentDate = logDate;
    } else if (diff > 1 && i === 0 && differenceInDays(new Date(), logDate) === 1) {
       // It's ok if yesterday was the last
       streak++;
       currentDate = logDate;
    } else {
      break;
    }
  }
  return streak;
};
