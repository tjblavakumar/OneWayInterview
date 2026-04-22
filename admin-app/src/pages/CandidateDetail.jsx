import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api';
import { ArrowLeft, RefreshCw, RotateCcw, CheckCircle, Play, X, Copy, ExternalLink } from 'lucide-react';

const STATUS_LABELS = {
  link_sent: 'Link Sent',
  candidate_response_received: 'Response Received',
  resent_link_done: 'Link Resent',
  complete_1way_interview: 'Completed',
};

const STATUS_COLORS = {
  link_sent: 'bg-yellow-100 text-yellow-800',
  candidate_response_received: 'bg-blue-100 text-blue-800',
  resent_link_done: 'bg-orange-100 text-orange-800',
  complete_1way_interview: 'bg-green-100 text-green-800',
};

export default function CandidateDetail() {
  const { id } = useParams();
  const [candidate, setCandidate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resubmitMsg, setResubmitMsg] = useState('');
  const [showResubmit, setShowResubmit] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    loadCandidate();
  }, [id]);

  async function loadCandidate() {
    try {
      const data = await api.getCandidate(id);
      setCandidate(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    try {
      const result = await api.resendLink(id);
      const link = `${window.location.protocol}//${window.location.hostname}:3002/interview/${result.token}`;
      setGeneratedLink(link);
      loadCandidate();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResubmit() {
    try {
      const result = await api.requestResubmit(id, resubmitMsg);
      const link = `${window.location.protocol}//${window.location.hostname}:3002/interview/${result.token}`;
      setGeneratedLink(link);
      setShowResubmit(false);
      setResubmitMsg('');
      loadCandidate();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleMarkComplete() {
    try {
      await api.markComplete(id);
      loadCandidate();
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;
  if (!candidate) return <div className="text-red-500">{error || 'Candidate not found'}</div>;

  return (
    <div>
      <Link to="/candidates" className="text-blue-600 hover:underline text-sm flex items-center gap-1 mb-4">
        <ArrowLeft size={16} /> Back to Candidates
      </Link>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4">{error}</div>}

      {/* Generated Interview Link */}
      {generatedLink && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-green-800">Interview Link Generated</p>
            <button onClick={() => setGeneratedLink('')} className="text-green-600 hover:text-green-800"><X size={16} /></button>
          </div>
          <p className="text-xs text-green-700 mb-2">Share this link with the candidate (valid for 1 hour):</p>
          <div className="flex items-center gap-2">
            <input
              readOnly value={generatedLink}
              className="flex-1 bg-white border border-green-300 rounded-lg px-3 py-2 text-sm font-mono text-green-900"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={() => navigator.clipboard.writeText(generatedLink)}
              className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 whitespace-nowrap"
            >Copy</button>
            <a
              href={generatedLink} target="_blank" rel="noopener noreferrer"
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap"
            >Open</a>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold">{candidate.name}</h2>
            <p className="text-gray-500">{candidate.email}</p>
            <p className="text-sm text-gray-400 mt-1">Position: <span className="text-gray-700 font-medium">{candidate.position_title}</span></p>
            <p className="text-sm text-gray-400">Expiry: {new Date(candidate.expiry_date).toLocaleDateString()}</p>
          </div>
          <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_COLORS[candidate.status] || 'bg-gray-100'}`}>
            {STATUS_LABELS[candidate.status] || candidate.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex gap-2 mt-4 pt-4 border-t">
          <button onClick={handleResend} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50">
            <RefreshCw size={14} /> Resend Link
          </button>
          <button onClick={() => setShowResubmit(!showResubmit)} className="flex items-center gap-1 px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 text-orange-600">
            <RotateCcw size={14} /> Request Resubmit
          </button>
          {candidate.status === 'candidate_response_received' && (
            <button onClick={handleMarkComplete} className="flex items-center gap-1 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
              <CheckCircle size={14} /> Mark Complete
            </button>
          )}
        </div>

        {/* Resubmit Form */}
        {showResubmit && (
          <div className="mt-3 p-3 bg-orange-50 rounded-lg">
            <textarea
              value={resubmitMsg}
              onChange={(e) => setResubmitMsg(e.target.value)}
              placeholder="Optional message to candidate explaining why..."
              className="w-full border rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
              rows={2}
            />
            <button onClick={handleResubmit} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-orange-600">
              Send Resubmit Request
            </button>
          </div>
        )}
      </div>

      {/* Video Responses */}
      <h3 className="text-lg font-semibold mb-3">Video Responses</h3>
      {candidate.responses && candidate.responses.length > 0 ? (
        <div className="space-y-4">
          {candidate.responses.map((r, i) => (
            <div key={r.id} className="bg-white border rounded-xl p-4">
              <p className="text-sm font-medium text-gray-600 mb-2">Q{i + 1}: {r.question_text}</p>
              <video
                controls
                className="w-full max-w-2xl rounded-lg bg-black"
                src={`/api/videos/${r.video_path.replace('videos/', '')}`}
              >
                Your browser does not support video playback.
              </video>
              {r.duration && <p className="text-xs text-gray-400 mt-1">Duration: {Math.round(r.duration)}s</p>}
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white border rounded-xl p-8 text-center text-gray-400">
          No video responses yet
        </div>
      )}

      {/* Feedback */}
      {candidate.feedback && candidate.feedback.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-3">Candidate Feedback</h3>
          {candidate.feedback.map((f) => (
            <div key={f.id} className="bg-white border rounded-xl p-4 mb-2">
              <p className="text-sm">{f.comment}</p>
              <p className="text-xs text-gray-400 mt-1">{new Date(f.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Link History */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Link History</h3>
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Interview Link</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Created</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Expires</th>
                <th className="text-left px-4 py-2 font-medium text-gray-600">Status</th>
              </tr>
            </thead>
            <tbody>
              {(candidate.links || []).map((l) => (
                <tr key={l.id} className="border-b last:border-0">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-gray-500">...{l.token.slice(-8)}</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(`${window.location.protocol}//${window.location.hostname}:3002/interview/${l.token}`)}
                        className="p-1 text-gray-400 hover:text-blue-600" title="Copy link"
                      ><Copy size={12} /></button>
                      <a
                        href={`${window.location.protocol}//${window.location.hostname}:3002/interview/${l.token}`}
                        target="_blank" rel="noopener noreferrer"
                        className="p-1 text-gray-400 hover:text-blue-600" title="Open link"
                      ><ExternalLink size={12} /></a>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-gray-500 text-xs">{new Date(l.expires_at).toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${l.used ? 'bg-gray-100 text-gray-600' : new Date(l.expires_at) < new Date() ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'}`}>
                      {l.used ? 'Used' : new Date(l.expires_at) < new Date() ? 'Expired' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
