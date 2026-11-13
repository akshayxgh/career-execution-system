import { authenticateAgentRequest } from './_agentAuth.js';

export default async function handler(req, res) {
  const auth = authenticateAgentRequest(req);
  if (!auth.authenticated) {
    return res.status(401).json({ ok: false, message: auth.error || 'Unauthorized' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'Method Not Allowed' });
  }

  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const targetUrl = urlObj.searchParams.get('url');

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
  } catch (err) {
    console.error('Error in video-meta handler:', err);
    return res.status(500).json({ ok: false, message: err.message || 'Internal Server Error' });
  }
}
