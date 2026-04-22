import { useState, useEffect } from 'react';
import { api } from '../api';
import { Plus, Trash2, ChevronDown, ChevronUp, GripVertical } from 'lucide-react';

export default function Positions() {
  const [positions, setPositions] = useState([]);
  const [newTitle, setNewTitle] = useState('');
  const [expanded, setExpanded] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPositions();
  }, []);

  async function loadPositions() {
    try {
      const data = await api.getPositions();
      setPositions(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePosition(e) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    try {
      setError('');
      await api.createPosition(newTitle.trim());
      setNewTitle('');
      loadPositions();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeletePosition(id) {
    if (!confirm('Delete this position and all its questions?')) return;
    try {
      await api.deletePosition(id);
      if (expanded === id) setExpanded(null);
      loadPositions();
    } catch (err) {
      setError(err.message);
    }
  }

  async function toggleExpand(positionId) {
    if (expanded === positionId) {
      setExpanded(null);
      return;
    }
    setExpanded(positionId);
    try {
      const qs = await api.getQuestions(positionId);
      setQuestions(qs);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAddQuestion(e) {
    e.preventDefault();
    if (!newQuestion.trim() || !expanded) return;
    try {
      setError('');
      await api.createQuestion(expanded, newQuestion.trim());
      setNewQuestion('');
      const qs = await api.getQuestions(expanded);
      setQuestions(qs);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteQuestion(id) {
    try {
      await api.deleteQuestion(id);
      const qs = await api.getQuestions(expanded);
      setQuestions(qs);
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <div className="text-gray-500">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Positions & Questions</h2>

      {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg mb-4">{error}</div>}

      {/* Create Position */}
      <form onSubmit={handleCreatePosition} className="flex gap-2 mb-6">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="New position title..."
          className="flex-1 border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-1 hover:bg-blue-700">
          <Plus size={16} /> Add Position
        </button>
      </form>

      {/* Positions List */}
      <div className="space-y-2">
        {positions.map((pos) => (
          <div key={pos.id} className="bg-white border rounded-xl overflow-hidden">
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
              onClick={() => toggleExpand(pos.id)}
            >
              <div className="flex items-center gap-2">
                {expanded === pos.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                <span className="font-medium">{pos.title}</span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeletePosition(pos.id); }}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Trash2 size={16} />
              </button>
            </div>

            {expanded === pos.id && (
              <div className="border-t px-4 py-3 bg-gray-50">
                <p className="text-xs text-gray-500 mb-3">Interview Questions (max 5)</p>
                <div className="space-y-2 mb-3">
                  {questions.map((q, i) => (
                    <div key={q.id} className="flex items-center gap-2 bg-white border rounded-lg px-3 py-2 text-sm">
                      <GripVertical size={14} className="text-gray-300" />
                      <span className="text-gray-500 font-mono text-xs">Q{i + 1}</span>
                      <span className="flex-1">{q.question_text}</span>
                      <button onClick={() => handleDeleteQuestion(q.id)} className="text-red-400 hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {questions.length === 0 && (
                    <p className="text-sm text-gray-400 italic">No questions added yet</p>
                  )}
                </div>
                {questions.length < 5 && (
                  <form onSubmit={handleAddQuestion} className="flex gap-2">
                    <input
                      type="text"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="Add a question..."
                      className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button type="submit" className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm hover:bg-blue-700">
                      Add
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        ))}
        {positions.length === 0 && (
          <p className="text-gray-400 text-center py-8">No positions created yet. Add one above.</p>
        )}
      </div>
    </div>
  );
}
