import { getServiceClient } from '../_db.js';
import { authenticateAgentRequest } from './_agentAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  const auth = authenticateAgentRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ ok: false, message: auth.error || 'Unauthorized' });
  }

  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const purpose = url.searchParams.get('purpose') || (url.searchParams.has('url') ? 'video-meta' : 'content');

  // =========================================================================
  // SUB-HANDLER: Video / Course Metadata (oEmbed / Web Scraper)
  // Consolidated here to stay within Vercel's 12 Serverless Function limit
  // =========================================================================
  if (purpose === 'video-meta') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl || !targetUrl.trim()) {
      return res.status(400).json({ ok: false, message: 'Missing "url" parameter.' });
    }

    const cleanUrl = targetUrl.trim();

    // 1. YouTube Handler via oEmbed (No API key needed)
    const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(cleanUrl);
    if (isYouTube) {
      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(cleanUrl)}&format=json`;
        const ytRes = await fetch(oembedUrl);
        if (ytRes.ok) {
          const ytData = await ytRes.json();
          return res.status(200).json({
            ok: true,
            provider: 'YouTube',
            title: ytData.title || '',
            author: ytData.author_name || '',
            authorUrl: ytData.author_url || '',
            thumbnail: ytData.thumbnail_url || '',
            url: cleanUrl,
          });
        }
      } catch (ytErr) {
        console.warn('Failed to fetch YouTube oEmbed:', ytErr);
      }
    }

    // 2. Generic Webpage / Course Fallback (Extract OpenGraph or HTML title)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const pageRes = await fetch(cleanUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (pageRes.ok) {
        const html = await pageRes.text();
        const titleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i) ||
                           html.match(/<title>(.*?)<\/title>/i);
        const authorMatch = html.match(/<meta\s+name=["']author["']\s+content=["'](.*?)["']/i) ||
                            html.match(/<meta\s+property=["']og:site_name["']\s+content=["'](.*?)["']/i);
        const imageMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["'](.*?)["']/i);

        const title = titleMatch ? titleMatch[1].trim() : '';
        const author = authorMatch ? authorMatch[1].trim() : '';
        const thumbnail = imageMatch ? imageMatch[1].trim() : '';

        return res.status(200).json({
          ok: true,
          provider: 'Web / Course',
          title: title || cleanUrl,
          author: author || 'Instructor / Author',
          thumbnail,
          url: cleanUrl,
        });
      }
    } catch {
      // Return bare URL on network / CORS failure
    }

    return res.status(200).json({
      ok: true,
      provider: 'External Link',
      title: cleanUrl,
      author: '',
      thumbnail: '',
      url: cleanUrl,
    });
  }

  const supportedPurposes = ['content', 'networking', 'opportunities'];
  if (!supportedPurposes.includes(purpose)) {
    return res.status(400).json({
      ok: false,
      message: `Unsupported purpose '${purpose}'. Supported values: ${supportedPurposes.join(', ')}.`,
    });
  }

  try {
    const supabase = getServiceClient();
    const { data: stateRow, error } = await supabase
      .from('app_state')
      .select('data')
      .eq('user_id', 'Akshay')
      .single();

    if (error || !stateRow?.data) {
      return res.status(500).json({
        ok: false,
        message: `Failed to load MYCES context: ${error?.message || 'Empty state'}`,
      });
    }

    const fullState = stateRow.data;

    // Common: Projects
    const allProjects = Array.isArray(fullState.projects) ? fullState.projects : [];
    const relevantProjects = allProjects
      .filter((p) => p.lessonsLearned || ['Completed', 'Published', 'Building'].includes(p.status))
      .map((p) => ({
        id: p.id,
        name: p.name,
        category: p.category,
        status: p.status,
        technologiesUsed: p.technologiesUsed || [],
        lessonsLearned: p.lessonsLearned || '',
        githubLink: p.githubLink || '',
        portfolioLink: p.portfolioLink || '',
      }));

    if (purpose === 'content') {
      // 1. Process Concepts: prioritize unposted concepts
      const allConcepts = Array.isArray(fullState.concepts) ? fullState.concepts : [];
      const sanitizedConcepts = allConcepts.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        notes: c.notes || '',
        notebookLmAudioLink: c.notebookLmAudioLink || '',
        notebookLmResearchLink: c.notebookLmResearchLink || '',
        linkedinPostLink: c.linkedinPostLink || '',
        learningDate: c.learningDate,
        hasPost: Boolean(c.linkedinPostLink && c.linkedinPostLink.trim().length > 0),
      }));

      // Unposted concepts first
      sanitizedConcepts.sort((a, b) => (a.hasPost === b.hasPost ? 0 : a.hasPost ? 1 : -1));

      // 2. Relevant Learning Context: modules actively learned or mastered
      const allTracks = Array.isArray(fullState.learningTracks) ? fullState.learningTracks : [];
      const activeLearning = allTracks.map((track) => ({
        name: track.name,
        masteredModules: (track.modules || [])
          .filter((m) => m.status === 'Mastered' || m.status === 'Interview Ready')
          .map((m) => m.name),
        inProgressModules: (track.modules || [])
          .filter((m) => m.status === 'Learning' || m.status === 'Practicing')
          .map((m) => m.name),
      }));

      // Fetch active content memories (style guide, topic performance)
      const { data: contentMemories } = await supabase
        .from('linkedin_agent_memory')
        .select('*')
        .eq('user_id', 'Akshay')
        .in('memory_type', ['WRITING_STYLE_GUIDE', 'TOPIC_PERFORMANCE', 'LESSON_LEARNED'])
        .order('confidence', { ascending: false });

      return res.status(200).json({
        ok: true,
        purpose: 'content',
        user: 'Akshay',
        context: {
          concepts: sanitizedConcepts,
          projects: relevantProjects,
          learning: activeLearning,
          memories: contentMemories || [],
        },
      });
    }

    // Networking & Opportunities
    const targetRoles = Array.isArray(fullState.targetRoles) && fullState.targetRoles.length > 0
      ? fullState.targetRoles
      : ['Senior Data Engineer', 'Power BI Specialist', 'Fabric / Cloud BI Architect'];

    // Target Companies derived from application pipeline
    const apps = Array.isArray(fullState.applications) ? fullState.applications : [];
    const targetCompanies = Array.from(
      new Set(
        apps
          .map((a) => a.company?.trim())
          .filter((c) => Boolean(c && c.length > 1))
      )
    ).slice(0, 25);

    // Extract core skills
    const skills = [
      'Power BI',
      'DAX Optimization',
      'Microsoft Fabric (Direct Lake)',
      'SQL / T-SQL',
      'Python',
      'Data Modeling (Star Schema)',
      'Azure Data Factory',
    ];

    // Fetch existing tracked people, opportunities, and strategic outreach memories
    const [{ data: people }, { data: opportunities }, { data: networkingMemories }] = await Promise.all([
      supabase
        .from('linkedin_people')
        .select('*')
        .eq('user_id', 'Akshay')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase
        .from('linkedin_opportunities')
        .select('*, contact_person:linkedin_people(*)')
        .eq('user_id', 'Akshay')
        .order('updated_at', { ascending: false })
        .limit(50),
      supabase
        .from('linkedin_agent_memory')
        .select('*')
        .eq('user_id', 'Akshay')
        .in('memory_type', ['OUTREACH_STRATEGY', 'AUDIENCE_PREFERENCE', 'LESSON_LEARNED'])
        .order('confidence', { ascending: false }),
    ]);

    return res.status(200).json({
      ok: true,
      purpose,
      user: 'Akshay',
      context: {
        targetRoles,
        targetCompanies,
        skills,
        projects: relevantProjects,
        people: people || [],
        opportunities: opportunities || [],
        memories: networkingMemories || [],
      },
    });
  } catch (err) {
    console.error('Error fetching agent context:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
