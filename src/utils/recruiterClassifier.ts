/**
 * Intelligent Recruiter vs Peer Classifier for LinkedIn Profiles
 * 
 * Accurately distinguishes between:
 * 1. Dedicated Talent Acquisition & HR Recruiters
 * 2. Data / BI / Analytics / Engineering Peers
 * 
 * Prevents false positives caused by substring checks (e.g. "through", "thru", "Synchrony", "threat" matching "hr")
 * and handles practitioners who have "hiring" in their headline.
 */

export interface ClassifierProfile {
  headline?: string | null;
  role?: string | null;
  tags?: string[] | string | null;
}

const RECRUITER_REGEX = /\b(recruiter|recruiting|recruitment|talent\s*a[c]?quisition|talent\s*hiring[s]?|talent\s*partner|talent\s*specialist|talent\s*sourcer|talent\s*lead|talent\s*advisor|talent\s*manager|sourcer|headhunter|staffing|human\s*resources|hrbp|hr\s*executive|hr\s*manager|hr\s*specialist|hr\s*generalist|hr\s*lead|hr\s*director|hr\s*consultant|hr\s*recruiter|technical\s*recruitment|technical\s*recruiter|it\s*recruiter|campus\s*recruiter|campus\s*hiring|people\s*&\s*culture|people\s*partner|people\s*operations|ta\s*specialist|ta\s*partner|ta\s*lead)\b/i;

const HR_STANDALONE_REGEX = /\bhr\b/i;
const HR_ANALYTICS_EXCLUSION_REGEX = /\bhr\s*(analytics|analyst|data|ops)\b/i;

const DATA_PEER_REGEX = /\b(data\s*analyst|senior\s*data\s*analyst|lead\s*data\s*analyst|data\s*engineer|senior\s*data\s*engineer|data\s*scientist|data\s*governance|data\s*architect|data\s*operations|master\s*data|data\s*quality|business\s*intelligence|bi\s*developer|bi\s*analyst|bi\s*specialist|bi\s*engineer|power\s*bi|tableau|analytics\s*manager|analytics\s*lead|analytics\s*engineer|avp[,\s]+analytics|vp[,\s]+analytics|head\s+of\s+analytics|director\s+of\s+analytics|sql\s*developer|mis\s*analyst|reporting\s*analyst|database\s*administrator|etl\s*developer|data\s*&\s*ai|analytics|data)\b/i;

export function checkIsRecruiter(profile?: ClassifierProfile | null): boolean {
  if (!profile) return false;

  const h = (profile.headline || '').trim();
  const r = (profile.role || '').trim();
  const tagsStr = Array.isArray(profile.tags)
    ? profile.tags.join(' ')
    : typeof profile.tags === 'string'
    ? profile.tags
    : '';

  const combined = `${r} ${h} ${tagsStr}`.toLowerCase();

  const isRecruiterWord =
    RECRUITER_REGEX.test(combined) ||
    (HR_STANDALONE_REGEX.test(combined) && !HR_ANALYTICS_EXCLUSION_REGEX.test(combined));

  if (!isRecruiterWord) return false;

  // Check if they are actually a Data/Engineering practitioner (e.g. "Senior Data Analyst", "Data Governance Leader")
  if (DATA_PEER_REGEX.test(combined)) {
    // If they have data practitioner keywords, check if their primary job title (first segment) is explicitly a recruiter
    const firstSegment = h.split(/[|•–\n@-]/)[0].toLowerCase().trim();
    if (
      RECRUITER_REGEX.test(firstSegment) ||
      (HR_STANDALONE_REGEX.test(firstSegment) && !HR_ANALYTICS_EXCLUSION_REGEX.test(firstSegment))
    ) {
      return true; // e.g. "Technical Recruiter | Hiring Data Analysts"
    }
    return false; // e.g. "Senior Data Analyst | Power BI" or "Lead Data Analyst | Hiring for my team"
  }

  return true;
}

export function checkIsDataPeer(profile?: ClassifierProfile | null): boolean {
  if (!profile) return false;
  return !checkIsRecruiter(profile);
}
