import type { StoreState } from '../types';
import { differenceInDays, isSameWeek } from 'date-fns';
import { getOperationalDateObject, formatToOperationalDate } from './dateUtils';

export const calculateExecutionScore = (state: StoreState): number => {
  const currentOpDate = getOperationalDateObject();

  // A simplistic score out of 100 based on recent activity (e.g., this week)
  // 1. Applications Sent (30%) - target: 5 per week -> 6 points each
  const appsThisWeek = state.applications.filter(app => 
    isSameWeek(getOperationalDateObject(app.appliedDate), currentOpDate) && app.status !== 'Saved'
  ).length;
  const appScore = Math.min(30, appsThisWeek * 6);

  // 2. Interviews Attended (25%) - target: 1 per week -> 25 points
  const interviewsThisWeek = state.interviews.filter(i => 
    isSameWeek(getOperationalDateObject(i.date), currentOpDate)
  ).length;
  const interviewScore = Math.min(25, interviewsThisWeek * 25);

  // 3. Certification Progress (15%) - based on modules completed in PL-300 track
  const totalModules = state.learningTracks.flatMap(t => t.modules).length;
  const completedModules = state.learningTracks.flatMap(t => t.modules).filter(m => m.status === 'Mastered').length;
  const certScore = totalModules === 0 ? 0 : Math.min(15, (completedModules / totalModules) * 15);

  // 4. Projects Completed (10%) - target: 1 project -> 10 points
  const completedProjects = state.projects.filter(p => p.status === 'Completed' || p.status === 'Published').length;
  const projectScore = Math.min(10, completedProjects * 10);

  // 5. Study Consistency (10%) - target: 5 days this week -> 2 points per day
  const studyDaysThisWeek = new Set(
    state.studyLogs
      .filter(l => isSameWeek(getOperationalDateObject(l.date), currentOpDate))
      .map(l => formatToOperationalDate(l.date))
  ).size;
  const consistencyScore = Math.min(10, studyDaysThisWeek * 2);

  // 6. Study Hours (10%) - target: 20 hours this week -> 0.5 points per hour
  const hoursThisWeek = state.studyLogs
    .filter(l => isSameWeek(getOperationalDateObject(l.date), currentOpDate))
    .reduce((sum, log) => sum + log.actualHours, 0);
  const hoursScore = Math.min(10, hoursThisWeek * 0.5);

  return Math.round(appScore + interviewScore + certScore + projectScore + consistencyScore + hoursScore);
};

export const getStreak = (state: StoreState): number => {
  if (state.studyLogs.length === 0) return 0;
  
  // Normalize dates to operational dates (changes at 6:30 AM IST)
  const dates = [...new Set(state.studyLogs.map(l => formatToOperationalDate(l.date)))]
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  
  let streak = 0;
  let currentDate = getOperationalDateObject();

  for (let i = 0; i < dates.length; i++) {
    const logDate = new Date(dates[i]);
    const diff = differenceInDays(currentDate, logDate);
    
    if (diff === 0 || diff === 1) {
      streak++;
      currentDate = logDate;
    } else if (diff > 1 && i === 0 && differenceInDays(getOperationalDateObject(), logDate) === 1) {
       // It's ok if yesterday was the last
       streak++;
       currentDate = logDate;
    } else {
      break;
    }
  }
  return streak;
};

