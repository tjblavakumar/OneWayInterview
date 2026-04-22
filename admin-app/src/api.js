const API_BASE = '/api/admin';

async function request(url, options = {}) {
  const res = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

export const api = {
  // Positions
  getPositions: () => request('/positions'),
  createPosition: (title) => request('/positions', { method: 'POST', body: JSON.stringify({ title }) }),
  deletePosition: (id) => request(`/positions/${id}`, { method: 'DELETE' }),

  // Questions
  getQuestions: (positionId) => request(`/positions/${positionId}/questions`),
  createQuestion: (positionId, question_text, sort_order) =>
    request(`/positions/${positionId}/questions`, {
      method: 'POST',
      body: JSON.stringify({ question_text, sort_order }),
    }),
  updateQuestion: (id, data) => request(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id) => request(`/questions/${id}`, { method: 'DELETE' }),

  // Candidates
  getCandidates: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/candidates${qs ? '?' + qs : ''}`);
  },
  createCandidate: (data) => request('/candidates', { method: 'POST', body: JSON.stringify(data) }),
  getCandidate: (id) => request(`/candidates/${id}`),
  resendLink: (id) => request(`/candidates/${id}/resend-link`, { method: 'POST' }),
  requestResubmit: (id, message) =>
    request(`/candidates/${id}/request-resubmit`, { method: 'POST', body: JSON.stringify({ message }) }),
  markComplete: (id) => request(`/candidates/${id}/mark-complete`, { method: 'POST' }),

  // Dashboard
  getDashboardStats: () => request('/dashboard/stats'),
};
