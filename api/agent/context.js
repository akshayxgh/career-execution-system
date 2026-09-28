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
  const purpose = url.searchParams.get('purpose') || 'content';

  if (purpose !== 'content') {
    // For Phase 1, purpose=content is the primary requirement
    return res.status(400).json({
      ok: false,
      message: `Unsupported purpose '${purpose}'. Phase 1 supports purpose=content.`,
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

    // 2. Process Projects: completed/published projects with lessons learned
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

    // 3. Relevant Learning Context: modules actively learned or mastered
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

    return res.status(200).json({
      ok: true,
      purpose: 'content',
      user: 'Akshay',
      context: {
        concepts: sanitizedConcepts,
        projects: relevantProjects,
        learning: activeLearning,
      },
    });
  } catch (err) {
    console.error('Error fetching agent context:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
