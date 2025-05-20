import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Square, Send, RefreshCw, Check } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { useToast } from "../hooks/use-toast.ts";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog.tsx";

interface AudioRecorderProps {
  onSend?: (audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(Array(20).fill(3));
  const [showSuccess, setShowSuccess] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    return () => {
      // Cleanup function
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioUrl]);

  const getSupportedMimeType = () => {
    const types = [
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/webm;codecs=opus',
      'audio/webm'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/webm'; // fallback
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const mediaStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      mediaStreamSource.connect(analyser);
      analyserRef.current = analyser;
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000 // 128kbps for good quality
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        chunksRef.current = [];
      };

      // Start recording with 1-second chunks for better memory management
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setAudioBlob(null);
      setAudioUrl(null);

      // Start timer
      timerRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      // Start visualizer
      const updateVisualizer = () => {
        if (analyserRef.current && dataArrayRef.current) {
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          // Create visualizer effect
          const newBarHeights = Array(20).fill(0).map((_, i) => {
            const index = Math.floor((i / 20) * dataArrayRef.current!.length);
            // Scale down the values (max is 255)
            return Math.max(3, Math.min(40, dataArrayRef.current![index] / 6));
          });

          setBarHeights(newBarHeights);
        }

        animationFrameRef.current = requestAnimationFrame(updateVisualizer);
      };

      updateVisualizer();

    } catch (error) {
      console.error('Error accessing microphone:', error);
      toast({
        title: 'Error',
        description: 'Could not access microphone. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();

      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioRef.current && audioUrl) {
      audioRef.current.play();
    }
  };

  const handleRetake = () => {
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioBlob(null);
    setAudioUrl(null);
    setRecordingTime(0);
  };

  const handleSend = () => {
    if (audioBlob && onSend) {
      handleAudioSend(audioBlob);
      toast({
        title: 'Voice Note Sent',
        description: 'Your voice note has been sent successfully.',
        duration: 4000, // 4 seconds
      });
      // Show success indicator
      setShowSuccess(true);
      // Hide success indicator after 4 seconds
      setTimeout(() => {
        setShowSuccess(false);
      }, 4000);
      // Reset state
      setAudioBlob(null);
      setAudioUrl(null);
    }
  };

  const handleAudioSend = async (blob: Blob) => {
    if (onSend) {
      // Convert the blob to MP3 if it's not already
      const mimeType = getSupportedMimeType();
      if (!blob.type.includes('mp3') && !blob.type.includes('mpeg')) {
        // If the browser doesn't support direct MP3 recording, we'll keep the original format
        console.log('Using original audio format:', blob.type);
      }
      onSend(blob);
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="allo-card flex flex-col space-y-4">
      <h3 className="text-lg font-medium">Voice Note</h3>

      {/* Visualizer */}
      <div className="audio-visualizer my-2">
        {barHeights.map((height, index) => (
          <div
            key={index}
            className="audio-bar"
            style={{
              height: `${height}px`,
              opacity: isRecording ? 1 : 0.3
            }}
          ></div>
        ))}
      </div>

      {/* Timer display */}
      <div className="text-center text-sm text-allo-muted">
        {isRecording ? (
          <span className="recording-pulse text-red-500">{formatTime(recordingTime)}</span>
        ) : audioUrl ? (
          <span>Recording ready</span>
        ) : showSuccess ? (
          <span className="text-green-600 flex items-center justify-center gap-1">
            <Check size={16} />
            Voice note sent
          </span>
        ) : (
          <span>Click to record</span>
        )}
      </div>

      {/* Controls */}
      <div className="flex justify-center space-x-4">
        {isRecording ? (
          <Button
            className="bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center"
            onClick={stopRecording}
          >
            <Square size={18} />
          </Button>
        ) : audioUrl ? (
          <>
            <Button
              className="bg-allo-secondary hover:bg-allo-secondary/80 text-allo-text rounded-full w-12 h-12 flex items-center justify-center"
              onClick={playRecording}
            >
              <Play size={18} />
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white rounded-full w-12 h-12 flex items-center justify-center"
              onClick={handleRetake}
            >
              <RefreshCw size={18} />
            </Button>
            <Button
              className="bg-allo-primary hover:bg-allo-primary/80 text-white rounded-full w-12 h-12 flex items-center justify-center"
              onClick={handleSend}
            >
              <Send size={18} />
            </Button>
          </>
        ) : showSuccess ? (
          <Button
            className="bg-green-500 hover:bg-green-600 text-white rounded-full w-12 h-12 flex items-center justify-center"
            disabled
          >
            <Check size={18} />
          </Button>
        ) : (
          <Button
            className="bg-allo-primary hover:bg-allo-primary/80 text-white rounded-full w-12 h-12 flex items-center justify-center"
            onClick={startRecording}
          >
            <Mic size={18} />
          </Button>
        )}
      </div>

      {audioUrl && (
        <audio ref={audioRef} src={audioUrl} className="hidden" />
      )}
    </div>
  );
};

export default AudioRecorder;
