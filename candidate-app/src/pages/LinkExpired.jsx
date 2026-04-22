import { AlertTriangle } from 'lucide-react';

export default function LinkExpired() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center max-w-md px-6">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="text-red-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Link Expired or Invalid</h2>
        <p className="text-gray-500">
          This interview link is no longer valid. It may have expired or already been used.
          Please contact the recruiter for a new link.
        </p>
      </div>
    </div>
  );
}
