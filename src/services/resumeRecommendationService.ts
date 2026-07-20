import { supabase } from '../lib/supabase';

export interface ResumeRecommendation {
  recommended: {
    id: string;
    name: string;
  };
  score: number;
  method: 'TITLE_MATCH';
  reason: string;
  confidence: number;
  descriptionScore: number;
  totalScore: number;
}

export interface MasterResume {
  id: string;
  resume_name: string;
  role_keywords: string[];
  focus_keywords: string[];
  priority: number;
  active: boolean;
}

export const MatchType = {
  EXACT: 'EXACT',
  CONTAINS: 'CONTAINS',
  TOKEN: 'TOKEN',
  NONE: 'NONE'
} as const;

export type MatchType = typeof MatchType[keyof typeof MatchType];

export const MATCH_SCORES: Record<MatchType, number> = {
  [MatchType.EXACT]: 100,
  [MatchType.CONTAINS]: 90,
  [MatchType.TOKEN]: 70,
  [MatchType.NONE]: 0
};

// Stop words to filter out
const STOP_WORDS = new Set([
  'and', 'or', 'for', 'with', 'in', 'of', 'a', 'an', 'at', 'to', 'by', 'from', 'on', 'the', 'under', 'over', 'into', '&'
]);

// Generic words to filter out for token match comparison
const GENERIC_ROLE_WORDS = new Set([
  'senior', 'junior', 'lead', 'executive', 'associate', 'manager', 'specialist', 'engineer', 'developer', 'analyst', 'consultant', 'officer'
]);

// Helper: Tokenize string
function getWords(str: string): string[] {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// Helper: Get meaningful tokens (words that are not stop words or generic role words)
function getMeaningfulTokens(str: string): string[] {
  return getWords(str).filter(word => !STOP_WORDS.has(word) && !GENERIC_ROLE_WORDS.has(word));
}

// Helper: Check if meaningful tokens overlap between job title and keyword
function hasTokenOverlap(title: string, keyword: string): boolean {
  const titleTokens = getMeaningfulTokens(title);
  const keywordTokens = getMeaningfulTokens(keyword);

  if (titleTokens.length === 0 || keywordTokens.length === 0) {
    return false;
  }

  for (const token of titleTokens) {
    if (keywordTokens.includes(token)) {
      return true;
    }
  }

  return false;
}

// Helper: Match type calculator for a single keyword
function calculateMatchType(jobTitle: string, keyword: string): { type: MatchType; reason: string } {
  const tNorm = jobTitle.trim().toLowerCase();
  const kNorm = keyword.trim().toLowerCase();

  if (tNorm === kNorm) {
    return {
      type: MatchType.EXACT,
      reason: `Exact match found for role keyword '${keyword}'.`
    };
  }

  if (tNorm.includes(kNorm) || kNorm.includes(tNorm)) {
    return {
      type: MatchType.CONTAINS,
      reason: `Contains match found for role keyword '${keyword}'.`
    };
  }

  if (hasTokenOverlap(jobTitle, keyword)) {
    const titleTokens = getMeaningfulTokens(jobTitle);
    const keywordTokens = getMeaningfulTokens(keyword);
    const overlap = titleTokens.filter(t => keywordTokens.includes(t));
    return {
      type: MatchType.TOKEN,
      reason: `Token match found for role keyword '${keyword}' (shared terms: ${overlap.map(t => `'${t}'`).join(', ')}).`
    };
  }

  return {
    type: MatchType.NONE,
    reason: `No match found for role keyword '${keyword}'.`
  };
}

// Helper: Parse Keywords to handle DB formats
const parseKeywords = (value: string[] | string | null): string[] => {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
  } catch {
    return value
      .split(',')
      .map(keyword => keyword.trim())
      .filter(Boolean);
  }
};

// Helper: Calculate description score based on focus keywords
function calculateDescriptionScore(jobDescription: string | null | undefined, focusKeywords: string[]): number {
  if (!jobDescription) return 0;

  const descLower = jobDescription.toLowerCase();
  const uniqueKeywords = Array.from(new Set(focusKeywords.map(k => k.trim().toLowerCase()))).filter(Boolean);
  let matchedCount = 0;

  for (const keyword of uniqueKeywords) {
    if (descLower.includes(keyword)) {
      matchedCount++;
    }
  }

  return matchedCount;
}

/**
 * Recommends the best master resume based on job title and optionally job description.
 * 
 * @param jobTitle The job title to match.
 * @param jobDescription Optional job description for focus keywords matching.
 */
export async function recommendResumeByTitle(
  jobTitle: string,
  jobDescription?: string | null
): Promise<ResumeRecommendation> {
  // 1. Fetch active resumes
  const { data: records, error } = await supabase
    .from('resume_library')
    .select('id, resume_name, role_keywords, focus_keywords, priority, active')
    .eq('active', true);

  if (error) {
    throw new Error(`Failed to load resumes from database: ${error.message}`);
  }

  if (!records || records.length === 0) {
    throw new Error('No active master resumes found in resume library.');
  }

  const masterResumes: MasterResume[] = records.map(r => ({
    id: r.id,
    resume_name: r.resume_name,
    role_keywords: parseKeywords(r.role_keywords),
    focus_keywords: parseKeywords(r.focus_keywords),
    priority: Number(r.priority),
    active: !!r.active,
  }));

  // 2. Score each resume on Title matching
  const titleScoredResumes = masterResumes.map(resume => {
    let highestScore = 0;
    let matchReason = 'No match found.';

    for (const keyword of resume.role_keywords) {
      const match = calculateMatchType(jobTitle, keyword);
      const score = MATCH_SCORES[match.type];
      if (score > highestScore) {
        highestScore = score;
        matchReason = match.reason;
      }
    }

    return {
      resume,
      titleScore: highestScore,
      reason: matchReason,
    };
  });

  // 3. Filter to resumes that successfully matched during Title matching (titleScore > 0)
  const matchedResumes = titleScoredResumes.filter(item => item.titleScore > 0);

  let finalCandidates: Array<{
    resume: MasterResume;
    titleScore: number;
    descriptionScore: number;
    totalScore: number;
    reason: string;
  }> = [];

  if (matchedResumes.length > 0) {
    // Only perform Description matching on successfully title-matched resumes
    finalCandidates = matchedResumes.map(item => {
      const descScore = calculateDescriptionScore(jobDescription, item.resume.focus_keywords);
      const finalReason = descScore > 0
        ? `${item.reason} Description Match: matched ${descScore} focus keyword(s).`
        : `${item.reason} Description Match: no focus keywords matched.`;
      
      return {
        resume: item.resume,
        titleScore: item.titleScore,
        descriptionScore: descScore,
        totalScore: item.titleScore + descScore,
        reason: finalReason
      };
    });
  } else {
    // Fallback to default Priority 1 active resume when no title matches occur
    const defaultResume = masterResumes.find(r => r.priority === 1) || masterResumes[0];
    finalCandidates = [{
      resume: defaultResume,
      titleScore: 0,
      descriptionScore: 0,
      totalScore: 0,
      reason: `No matching keywords found. Fell back to default highest-priority resume '${defaultResume.resume_name}'.`
    }];
  }

  // 4. Selection: sort by highest totalScore, then by lowest priority number
  const sortedResumes = finalCandidates.sort((a, b) => {
    if (a.totalScore !== b.totalScore) {
      return b.totalScore - a.totalScore; // Higher totalScore first
    }
    return a.resume.priority - b.resume.priority; // Lower priority number first (1 beats 2)
  });

  const bestMatch = sortedResumes[0];

  return {
    recommended: {
      id: bestMatch.resume.id,
      name: bestMatch.resume.resume_name,
    },
    score: bestMatch.totalScore,
    method: 'TITLE_MATCH',
    reason: bestMatch.reason,
    confidence: bestMatch.totalScore,
    descriptionScore: bestMatch.descriptionScore,
    totalScore: bestMatch.totalScore
  };
}
