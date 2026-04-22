import { Routes, Route } from 'react-router-dom';
import InterviewPage from './pages/InterviewPage';
import ThankYou from './pages/ThankYou';
import LinkExpired from './pages/LinkExpired';

function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b px-6 py-4">
        <h1 className="text-lg font-bold text-blue-600">OneWay Interview</h1>
      </header>
      <main className="flex-1">
        <Routes>
          <Route path="/interview/:token" element={<InterviewPage />} />
          <Route path="/thank-you" element={<ThankYou />} />
          <Route path="/link-expired" element={<LinkExpired />} />
          <Route path="*" element={<LinkExpired />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
