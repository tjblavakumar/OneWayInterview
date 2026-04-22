import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Send, Loader2 } from 'lucide-react';
import VideoRecorder from '../components/VideoRecorder';

const API_BASE = '/api/candidate';

export default function InterviewPage() {
  const { token } = useParams();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentQ, setCurrentQ] = useState(0);
  const [recordings, setRecordings] = useState({}); // { questionId: blob }
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [comment, setComment] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    validateLink();
  }, [token]);

  async function validateLink() {
    try {
      const res = await fetch(`${API_BASE}/interview/${token}`);
      if (!res.ok) {
        navigate('/link-expired');
        return;
      }
      const data = await res.json();
      setInterview(data);
    } catch {
      navigate('/link-expired');
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    try {
      const res = await fetch(`${API_BASE}/interview/${token}/start`, { method: 'POST' });
      if (!res.ok) {
        navigate('/link-expired');
        return;
      }
      setStarted(true);
    } catch {
      setError('Failed to start interview. Please try again.');
    }
  }

  async function handleRecorded(blob, duration) {
    const question = interview.questions[currentQ];
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      formData.append('video', blob, `response.${ext}`);
      formData.append('question_id', question.id);
      formData.append('duration', duration);

      const res = await fetch(`${API_BASE}/interview/${token}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      setRecordings(prev => ({ ...prev, [question.id]: blob }));
    } catch (err) {
      setError(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_BASE}/interview/${token}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comment }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed');
      }

      navigate('/thank-you');
    } catch (err) {
      setError(`Submission failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!interview) return null;

  const questions = interview.questions;
  const allRecorded = questions.every(q => recordings[q.id]);
  const isLastQuestion = currentQ === questions.length - 1;

  // Welcome screen before starting
  if (!started) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl border p-8 text-center">
          <h2 className="text-2xl font-bold mb-2">Welcome, {interview.candidate.name}!</h2>
          <p className="text-gray-500 mb-4">
            You are invited to complete a video interview for the position of{' '}
            <span className="font-semibold text-gray-700">{interview.candidate.position_title}</span>.
          </p>
          <div className="bg-blue-50 rounded-xl p-4 mb-6 text-left text-sm">
            <p className="font-medium text-blue-800 mb-2">Before you begin:</p>
            <ul className="space-y-1 text-blue-700">
              <li>• You will answer <strong>{questions.length}</strong> question{questions.length > 1 ? 's' : ''} via video</li>
              <li>• Each response can be up to <strong>3 minutes</strong> long</li>
              <li>• You can re-record each answer before moving on</li>
              <li>• Ensure your camera and microphone are working</li>
              <li>• Find a quiet, well-lit location</li>
              <li>• This link can only be used <strong>once</strong></li>
            </ul>
          </div>
          <button
            onClick={handleStart}
            className="bg-blue-600 text-white px-8 py-3 rounded-xl font-medium text-lg hover:bg-blue-700 transition-colors"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2 mb-6">
        {questions.map((q, i) => (
          <div
            key={q.id}
            className={`h-2 flex-1 rounded-full transition-colors ${
              recordings[q.id] ? 'bg-green-500' : i === currentQ ? 'bg-blue-500' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-gray-500 mb-1">
        Question {currentQ + 1} of {questions.length}
      </p>

      {/* Question */}
      <div className="bg-white border rounded-xl p-6 mb-6">
        <h3 className="text-lg font-semibold">{currentQuestion.question_text}</h3>
      </div>

      {/* Video Recorder */}
      <VideoRecorder
        key={currentQuestion.id}
        questionId={currentQuestion.id}
        onRecorded={handleRecorded}
        existingRecording={recordings[currentQuestion.id] || null}
      />

      {uploading && (
        <div className="flex items-center justify-center gap-2 mt-4 text-blue-600">
          <Loader2 className="animate-spin" size={18} />
          <span className="text-sm">Uploading video...</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between mt-8">
        <button
          onClick={() => setCurrentQ(prev => prev - 1)}
          disabled={currentQ === 0}
          className="flex items-center gap-1 px-4 py-2 border rounded-lg text-sm disabled:opacity-30 hover:bg-gray-50"
        >
          <ChevronLeft size={16} /> Previous
        </button>

        {!isLastQuestion ? (
          <button
            onClick={() => setCurrentQ(prev => prev + 1)}
            disabled={!recordings[currentQuestion.id]}
            className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm disabled:opacity-30 hover:bg-blue-700"
          >
            Next <ChevronRight size={16} />
          </button>
        ) : (
          recordings[currentQuestion.id] && (
            <div className="text-right">
              <p className="text-xs text-green-600 mb-1">
                {allRecorded ? '✓ All questions answered' : ''}
              </p>
            </div>
          )
        )}
      </div>

      {/* Submit Section (visible when all recorded) */}
      {allRecorded && (
        <div className="mt-8 bg-white border rounded-xl p-6">
          <h3 className="font-semibold mb-3">Ready to Submit</h3>
          <p className="text-sm text-gray-500 mb-4">
            All responses recorded. Add optional feedback below, then submit.
          </p>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Any feedback or comments for the recruiter? (optional)"
            className="w-full border rounded-lg px-4 py-3 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="bg-green-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-green-700 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {submitting ? 'Submitting...' : 'Submit Interview'}
          </button>
        </div>
      )}
    </div>
  );
}
