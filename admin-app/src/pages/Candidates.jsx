import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api';
import { buildInterviewUrl } from '../utils';
import { Plus, Send, RefreshCw, Eye, X } from 'lucide-react';

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

export default function Candidates() {
  const [searchParams] = useSearchParams();
  const [candidates, setCandidates] = useState([]);
  const [positions, setPositions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [filterPosition, setFilterPosition] = useState(searchParams.get('position_id') || '');
  const [filterStatus, setFilterStatus] = useState('');

  const [form, setForm] = useState({ name: '', email: '', position_id: '', expiry_date: '' });
  const [generatedLink, setGeneratedLink] = useState('');

  useEffect(() => {
    loadData();
  }, [filterPosition, filterStatus]);

  async function loadData() {
    try {
      setLoading(true);
      const params = {};
      if (filterPosition) params.position_id = filterPosition;
      if (filterStatus) params.status = filterStatus;
      const [cands, pos] = await Promise.all([api.getCandidates(params), api.getPositions()]);
      setCandidates(cands);
      setPositions(pos);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    try {
      setError('');
      const result = await api.createCandidate(form);
      const link = buildInterviewUrl(result.token);
      setGeneratedLink(link);
      setForm({ name: '', email: '', position_id: '', expiry_date: '' });
      setShowForm(false);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleResend(id) {
    try {
      const result = await api.resendLink(id);
      const link = buildInterviewUrl(result.token);
      setGeneratedLink(link);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // Default expiry date: 7 days from now
  function getDefaultExpiry() {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Candidates</h2>
        <button
          onClick={() => { setShowForm(!showForm); if (!form.expiry_date) setForm(f => ({ ...f, expiry_date: getDefaultExpiry() })); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-700"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancel' : 'Invite Candidate'}
        </button>
      </div>

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
              className="flex-1 bg-white border border-green-300 rounded-lg px-3 py-2 text-sm font-mono text-green-900 select-all"
              onClick={(e) => e.target.select()}
            />
            <button
              onClick={() => { navigator.clipboard.writeText(generatedLink); }}
              className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-green-700 whitespace-nowrap"
            >Copy</button>
            <a
              href={generatedLink} target="_blank" rel="noopener noreferrer"
              className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700 whitespace-nowrap"
            >Open</a>
          </div>
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <form onSubmit={handleCreate} className="bg-white border rounded-xl p-4 mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              type="text" required value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email" required value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
            <select
              required value={form.position_id}
              onChange={(e) => setForm({ ...form, position_id: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select position...</option>
              {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Response Expiry Date</label>
            <input
              type="date" required value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-1">
              <Send size={16} /> Send Interview Link
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <select
          value={filterPosition}
          onChange={(e) => setFilterPosition(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Positions</option>
          {positions.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {candidates.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 text-gray-500">{c.email}</td>
                  <td className="px-4 py-3">{c.position_title}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[c.status] || c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(c.expiry_date).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right flex justify-end gap-1">
                    <Link to={`/candidates/${c.id}`} className="p-1.5 text-gray-400 hover:text-blue-600 rounded" title="View details">
                      <Eye size={16} />
                    </Link>
                    <button onClick={() => handleResend(c.id)} className="p-1.5 text-gray-400 hover:text-orange-600 rounded" title="Resend link">
                      <RefreshCw size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {candidates.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No candidates found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
