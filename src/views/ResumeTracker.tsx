import { useEffect, useMemo, useState } from 'react';
import { Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';

const BUCKET = 'resume-library';

interface ResumeLibraryRecord {
  resume_name: string;
  role_keywords: string[] | string | null;
  focus_keywords: string[] | string | null;
  created_at: string;
  updated_at: string;
}

interface ResumeCardRecord extends ResumeLibraryRecord {
  docxFileName: string;
  hasDocx: boolean;
}

const parseKeywords = (value: string[] | string | null) => {
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

const displayName = (resumeName: string) => resumeName.replaceAll('_', ' ');

const formatDate = (value: string) => {
  if (!value) return '';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().split('T')[0];
};

export const ResumeTracker = () => {
  const [resumes, setResumes] = useState<ResumeCardRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadResumes() {
      setLoading(true);
      setError(null);

      const { data: records, error: recordsError } = await supabase
        .from('resume_library')
        .select('resume_name, role_keywords, focus_keywords, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (recordsError) {
        if (isMounted) {
          setError(recordsError.message);
          setLoading(false);
        }
        return;
      }

      const { data: files, error: filesError } = await supabase.storage
        .from(BUCKET)
        .list('', { limit: 1000 });

      if (filesError) {
        if (isMounted) {
          setError(filesError.message);
          setLoading(false);
        }
        return;
      }

      const docxFiles = new Set(
        (files ?? [])
          .map(file => file.name)
          .filter(name => name.toLowerCase().endsWith('.docx'))
      );

      const mappedResumes = (records ?? []).map(record => {
        const docxFileName = `${record.resume_name}.docx`;

        return {
          ...record,
          docxFileName,
          hasDocx: docxFiles.has(docxFileName),
        };
      });

      if (isMounted) {
        setResumes(mappedResumes);
        setLoading(false);
      }
    }

    loadResumes();

    return () => {
      isMounted = false;
    };
  }, []);

  const emptyMessage = useMemo(() => {
    if (loading) return 'Loading resumes...';
    if (error) return `Unable to load resumes: ${error}`;
    return 'No resume versions tracked.';
  }, [error, loading]);

  const handleDownload = async (resume: ResumeCardRecord) => {
    if (!resume.hasDocx) return;

    setDownloadingFile(resume.docxFileName);

    const { data, error: signedUrlError } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(resume.docxFileName, 60);

    setDownloadingFile(null);

    if (signedUrlError || !data?.signedUrl) {
      setError(signedUrlError?.message ?? 'Unable to create download link.');
      return;
    }

    const link = document.createElement('a');
    link.href = data.signedUrl;
    link.download = resume.docxFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ marginBottom: '0.5rem' }}>Resume Tracker</h1>
          <p className="text-muted">Manage targeted resumes for different roles.</p>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-6">
        {resumes.length === 0 ? (
          <div style={{ gridColumn: 'span 3' }} className="card text-center text-muted">
            {emptyMessage}
          </div>
        ) : resumes.map(resume => {
          const roleTarget = parseKeywords(resume.role_keywords)[0] ?? 'No role target';
          const focusKeywords = parseKeywords(resume.focus_keywords).join(', ');

          return (
            <div key={resume.resume_name} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}><FileText size={18} className="text-accent-primary" /> {displayName(resume.resume_name)}</h3>
              <span className="badge badge-info" style={{ alignSelf: 'flex-start' }}>{roleTarget}</span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <span>Created: {formatDate(resume.created_at)}</span>
                <span>Updated: {formatDate(resume.updated_at)}</span>
              </div>
              {focusKeywords && (
                <p className="text-sm text-muted" style={{ backgroundColor: 'var(--bg-dark)', padding: '0.5rem', borderRadius: 'var(--radius-sm)' }}>
                  {focusKeywords}
                </p>
              )}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                {resume.hasDocx ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => handleDownload(resume)}
                    disabled={downloadingFile === resume.docxFileName}
                  >
                    <Download size={16} /> {downloadingFile === resume.docxFileName ? 'Downloading...' : 'Download'}
                  </button>
                ) : (
                  <span className="badge badge-warning">DOCX Missing</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
