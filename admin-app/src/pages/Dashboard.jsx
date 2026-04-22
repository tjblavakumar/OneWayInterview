import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { Users, Briefcase, Clock, CheckCircle } from 'lucide-react';

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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-gray-500">Loading dashboard...</div>;
  if (!stats) return <div className="text-red-500">Failed to load dashboard</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border p-5 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-lg"><Users className="text-blue-600" size={24} /></div>
          <div>
            <p className="text-sm text-gray-500">Total Candidates</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
        </div>
        {stats.byStatus.map((s) => (
          <div key={s.status} className="bg-white rounded-xl border p-5 flex items-center gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              {s.status === 'complete_1way_interview' ? <CheckCircle className="text-green-600" size={24} /> : <Clock className="text-gray-500" size={24} />}
            </div>
            <div>
              <p className="text-sm text-gray-500">{STATUS_LABELS[s.status] || s.status}</p>
              <p className="text-2xl font-bold">{s.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* By Position */}
      <h3 className="text-lg font-semibold mb-3">Candidates by Position</h3>
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Position</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Candidates</th>
              <th className="text-right px-4 py-3 font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody>
            {stats.byPosition.map((p) => (
              <tr key={p.position_id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.title}</td>
                <td className="px-4 py-3 text-right">{p.count}</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    to={`/candidates?position_id=${p.position_id}`}
                    className="text-blue-600 hover:underline text-sm"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}
            {stats.byPosition.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-8 text-center text-gray-400">No positions yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
