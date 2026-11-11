import type { LinkedInPerson } from '../types/linkedin';
import { linkedinAgentService } from './linkedinAgentService';

export interface HygieneResult {
  totalProcessed: number;
  namesCleaned: number;
  contactsTagged: number;
  duplicatesMerged: number;
  alumniIdentified: number;
  details: string[];
}

export class NetworkHygieneService {
  /**
   * Cleans bloated LinkedIn names by removing emojis, pronouns, credential suffixes, and hiring slogans
   */
  cleanFullName(rawName: string): string {
    if (!rawName) return '';
    let name = rawName.trim();

    // 1. Remove emojis and symbols
    name = name.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}]/gu, '');

    // 2. Remove pronouns like (he/him), (she/her), (they/them), (LIR)
    name = name.replace(/\s*\([^)]*\)/gi, '');

    // 3. Remove brackets like [Hiring], [LIR]
    name = name.replace(/\s*\[[^\]]*\]/gi, '');

    // 4. Remove certification suffixes appended with commas or hyphens
    name = name.replace(/[,|–-]\s*(Ph\.?D\.?|MBA|PMP|CSM|LOMA\s*ALMI|Open to work|Hiring|HR|Recruiter).*$/gi, '');

    // 5. Remove trailing pipe delimiters e.g. "Name | Slogan"
    name = name.replace(/\|.*$/, '');

    // 6. Clean extra spaces
    name = name.replace(/\s+/g, ' ').trim();

    return name || rawName.trim();
  }

  /**
   * Normalizes LinkedIn profile URL to canonical vanity slug for deduplication
   */
  normalizeProfileSlug(url?: string): string {
    if (!url) return '';
    return url
      .toLowerCase()
      .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')
      .replace(/\/.*$/, '')
      .replace(/\?.*$/, '')
      .trim();
  }

  /**
   * Extracts alumni / past employers from headline or role
   */
  extractAlumniCompanies(text?: string): string[] {
    if (!text) return [];
    const companies: string[] = [];
    const regex = /(?:ex-|former(?:ly)?\s+(?:at\s+)?)([a-zA-Z0-9&.\s]{2,20})(?=\s*[,|/–-]|$)/gi;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const company = match[1].trim();
      if (company && !companies.includes(company)) {
        companies.push(company);
      }
    }
    return companies;
  }

  /**
   * Generates intelligent, standardized role, domain, tech, and alumni tags
   */
  generateSmartTags(person: LinkedInPerson): { tags: string[]; isNewTag: boolean } {
    const existingTags = Array.isArray(person.tags) ? [...person.tags] : [];
    const tagsSet = new Set<string>(existingTags);
    const combinedText = `${person.role || ''} ${person.headline || ''} ${person.company || ''}`.toLowerCase();

    // 1. Role Categories
    if (
      combinedText.includes('recruiter') ||
      combinedText.includes('talent acquisition') ||
      combinedText.includes('hiring') ||
      combinedText.includes('sourcer') ||
      combinedText.includes('staffing') ||
      combinedText.includes('human resources') ||
      combinedText.includes('hrbp')
    ) {
      tagsSet.add('Recruiter');
    }

    if (
      combinedText.includes('manager') ||
      combinedText.includes('director') ||
      combinedText.includes('lead') ||
      combinedText.includes('head') ||
      combinedText.includes('vp') ||
      combinedText.includes('partner')
    ) {
      tagsSet.add('Leadership');
    }

    if (
      combinedText.includes('power bi') ||
      combinedText.includes('business intelligence') ||
      combinedText.includes('data analyst') ||
      combinedText.includes('analytics') ||
      combinedText.includes('tableau') ||
      combinedText.includes('dax')
    ) {
      tagsSet.add('BI & Analytics');
    }

    if (
      combinedText.includes('data engineer') ||
      combinedText.includes('azure') ||
      combinedText.includes('snowflake') ||
      combinedText.includes('databricks') ||
      combinedText.includes('fabric') ||
      combinedText.includes('spark')
    ) {
      tagsSet.add('Data Engineering');
    }

    // 2. Domain Categories
    if (
      combinedText.includes('health') ||
      combinedText.includes('insurance') ||
      combinedText.includes('claims') ||
      combinedText.includes('pharma') ||
      combinedText.includes('lupin') ||
      combinedText.includes('care')
    ) {
      tagsSet.add('Healthcare');
    }

    if (
      combinedText.includes('pwc') ||
      combinedText.includes('deloitte') ||
      combinedText.includes('cognizant') ||
      combinedText.includes('wipro') ||
      combinedText.includes('consulting') ||
      combinedText.includes('ey') ||
      combinedText.includes('accenture')
    ) {
      tagsSet.add('Consulting');
    }

    // 3. Alumni / Past Companies
    const alumniList = this.extractAlumniCompanies(`${person.headline || ''} ${person.role || ''}`);
    alumniList.forEach((comp) => {
      tagsSet.add(`Alumni: ${comp}`);
    });

    const newTags = Array.from(tagsSet);
    const isNewTag = newTags.length > existingTags.length;

    return { tags: newTags, isNewTag };
  }

  /**
   * Executes the full AI Network Hygiene pipeline across all directory contacts
   */
  async runNetworkHygiene(
    people: LinkedInPerson[],
    onProgress?: (message: string) => void
  ): Promise<HygieneResult> {
    let namesCleaned = 0;
    let contactsTagged = 0;
    let duplicatesMerged = 0;
    let alumniIdentified = 0;
    const details: string[] = [];

    // Phase 1: Deduplication detection
    onProgress?.('Scanning for duplicate contacts and vanity URL collisions...');
    const slugMap = new Map<string, LinkedInPerson[]>();

    people.forEach((p) => {
      const slug = this.normalizeProfileSlug(p.profile_url);
      const key = slug || p.full_name.toLowerCase().trim();
      if (!slugMap.has(key)) slugMap.set(key, []);
      slugMap.get(key)!.push(p);
    });

    // Merge duplicates
    for (const [key, group] of slugMap.entries()) {
      if (group.length > 1) {
        // Find best canonical record (prioritize 'Intro Sent' or 'CONNECTED')
        group.sort((a, b) => {
          const aIntro = Array.isArray(a.tags) && a.tags.includes('Intro Sent') ? 10 : 0;
          const bIntro = Array.isArray(b.tags) && b.tags.includes('Intro Sent') ? 10 : 0;
          const aConn = a.connection_status === 'CONNECTED' ? 5 : 0;
          const bConn = b.connection_status === 'CONNECTED' ? 5 : 0;
          return bIntro + bConn - (aIntro + aConn);
        });

        const keeper = group[0];
        const duplicates = group.slice(1);

        // Merge tags and notes
        const mergedTags = new Set<string>(keeper.tags || []);
        let mergedNotes = keeper.interaction_notes || '';

        duplicates.forEach((dup) => {
          (dup.tags || []).forEach((t) => mergedTags.add(t));
          if (dup.interaction_notes && !mergedNotes.includes(dup.interaction_notes)) {
            mergedNotes = mergedNotes ? `${mergedNotes}\n${dup.interaction_notes}` : dup.interaction_notes;
          }
        });

        try {
          await linkedinAgentService.updatePerson(keeper.id, {
            tags: Array.from(mergedTags),
            interaction_notes: mergedNotes || null,
          });

          for (const dup of duplicates) {
            await linkedinAgentService.deletePerson(dup.id);
            duplicatesMerged++;
            details.push(`Merged duplicate profile: ${dup.full_name} into ${keeper.full_name}`);
          }
        } catch (err) {
          console.warn(`Failed to merge duplicate group for ${key}:`, err);
        }
      }
    }

    // Phase 2: Name Cleaning & Smart Tagging
    onProgress?.('Normalizing contact names and auto-tagging domains...');
    for (const person of people) {
      const cleanedName = this.cleanFullName(person.full_name);
      const isNameCleaned = cleanedName !== person.full_name;

      const { tags: smartTags, isNewTag } = this.generateSmartTags(person);
      const hasAlumni = smartTags.some((t) => t.startsWith('Alumni:'));
      if (hasAlumni) alumniIdentified++;

      if (isNameCleaned || isNewTag) {
        try {
          await linkedinAgentService.updatePerson(person.id, {
            full_name: cleanedName,
            tags: smartTags,
          });

          if (isNameCleaned) {
            namesCleaned++;
            details.push(`Cleaned name: "${person.full_name}" ➔ "${cleanedName}"`);
          }
          if (isNewTag) {
            contactsTagged++;
          }
        } catch (err) {
          console.warn(`Failed to update ${person.full_name}:`, err);
        }
      }
    }

    return {
      totalProcessed: people.length,
      namesCleaned,
      contactsTagged,
      duplicatesMerged,
      alumniIdentified,
      details,
    };
  }
}

export const networkHygieneService = new NetworkHygieneService();
