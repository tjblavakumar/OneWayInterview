import { Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, Briefcase } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Positions from './pages/Positions';
import Candidates from './pages/Candidates';
import CandidateDetail from './pages/CandidateDetail';

function App() {
  const linkClass = ({ isActive }) =>
    `flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 p-4 flex flex-col gap-1">
        <h1 className="text-lg font-bold text-blue-600 mb-6 px-4">OneWay Interview</h1>
        <NavLink to="/" end className={linkClass}>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>
        <NavLink to="/positions" className={linkClass}>
          <Briefcase size={18} /> Positions
        </NavLink>
        <NavLink to="/candidates" className={linkClass}>
          <Users size={18} /> Candidates
        </NavLink>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/positions" element={<Positions />} />
          <Route path="/candidates" element={<Candidates />} />
          <Route path="/candidates/:id" element={<CandidateDetail />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
