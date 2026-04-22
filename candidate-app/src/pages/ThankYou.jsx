import { CheckCircle } from 'lucide-react';

export default function ThankYou() {
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="text-center max-w-md px-6">
        <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircle className="text-green-500" size={32} />
        </div>
        <h2 className="text-2xl font-bold mb-2">Interview Submitted!</h2>
        <p className="text-gray-500">
          Thank you for completing your video interview. A confirmation email has been sent to you.
          The recruiting team will review your responses and get back to you.
        </p>
      </div>
    </div>
  );
}
