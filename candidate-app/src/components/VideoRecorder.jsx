import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, Square, RotateCcw, Upload, Mic, MicOff } from 'lucide-react';

const MAX_DURATION = 180; // 3 minutes in seconds

function getSupportedMimeType() {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return '';
}

export default function VideoRecorder({ questionId, onRecorded, existingRecording }) {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  const [status, setStatus] = useState('idle'); // idle | previewing | recording | recorded
  const [timeLeft, setTimeLeft] = useState(MAX_DURATION);
  const [recordedBlob, setRecordedBlob] = useState(existingRecording || null);
  const [error, setError] = useState('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function stopStream() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  }

  async function startCamera() {
    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play();
      }
      setStatus('previewing');
    } catch (err) {
      console.error('Camera error:', err);
      if (err.name === 'NotAllowedError') {
        setError('Camera/microphone access denied. Please allow access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No camera or microphone found. Please connect a camera and try again.');
      } else {
        setError(`Failed to access camera: ${err.message}`);
      }
    }
  }

  function startRecording() {
    const mimeType = getSupportedMimeType();
    if (!mimeType) {
      setError('Your browser does not support video recording. Please use Chrome, Edge, or Safari.');
      return;
    }

    chunksRef.current = [];
    const recorder = new MediaRecorder(streamRef.current, { mimeType });

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      setRecordedBlob(blob);
      setStatus('recorded');
      stopStream();
      // Show playback
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        videoRef.current.src = URL.createObjectURL(blob);
        videoRef.current.muted = false;
      }
    };

    mediaRecorderRef.current = recorder;
    recorder.start(1000); // collect in 1s chunks
    setStatus('recording');
    setTimeLeft(MAX_DURATION);

    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          stopRecording();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }

  function stopRecording() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }

  function reRecord() {
    setRecordedBlob(null);
    setStatus('idle');
    setTimeLeft(MAX_DURATION);
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.srcObject = null;
    }
    startCamera();
  }

  function handleConfirm() {
    if (recordedBlob && onRecorded) {
      const duration = MAX_DURATION - timeLeft;
      onRecorded(recordedBlob, duration);
    }
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      {/* Video Element */}
      <div className="relative bg-black rounded-xl overflow-hidden aspect-video mb-4">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          controls={status === 'recorded'}
        />

        {/* Timer Overlay */}
        {status === 'recording' && (
          <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-mono flex items-center gap-2">
            <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {formatTime(timeLeft)}
          </div>
        )}

        {/* Idle State */}
        {status === 'idle' && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button
              onClick={startCamera}
              className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-blue-700 transition-colors"
            >
              <Video size={20} /> Enable Camera
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3">
        {status === 'previewing' && (
          <button
            onClick={startRecording}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-red-700"
          >
            <Video size={18} /> Start Recording
          </button>
        )}

        {status === 'recording' && (
          <button
            onClick={stopRecording}
            className="bg-red-600 text-white px-6 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-red-700"
          >
            <Square size={18} /> Stop Recording
          </button>
        )}

        {status === 'recorded' && (
          <>
            <button
              onClick={reRecord}
              className="border border-gray-300 text-gray-700 px-5 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-gray-50"
            >
              <RotateCcw size={18} /> Re-record
            </button>
            <button
              onClick={handleConfirm}
              className="bg-green-600 text-white px-5 py-3 rounded-xl font-medium flex items-center gap-2 hover:bg-green-700"
            >
              <Upload size={18} /> Use This Recording
            </button>
          </>
        )}
      </div>

      {status === 'previewing' && (
        <p className="text-center text-sm text-gray-500 mt-3">
          Check your camera and audio, then click Start Recording. Max {MAX_DURATION / 60} minutes.
        </p>
      )}
    </div>
  );
}
