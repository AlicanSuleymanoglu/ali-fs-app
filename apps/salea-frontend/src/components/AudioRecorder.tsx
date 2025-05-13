
import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Square, Send } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { useToast } from "../hooks/use-toast.ts";

interface AudioRecorderProps {
  onSend?: (audioBlob: Blob) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ onSend }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [barHeights, setBarHeights] = useState<number[]>(Array(20).fill(3));

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

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioContext = new AudioContext();
      const mediaStreamSource = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;

      mediaStreamSource.connect(analyser);
      // Don't connect to audioContext.destination to avoid feedback

      analyserRef.current = analyser;
      const bufferLength = analyser.frequencyBinCount;
      dataArrayRef.current = new Uint8Array(bufferLength);

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        chunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        chunksRef.current = [];
      };

      // Start recording
      mediaRecorder.start();
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

  const handleSend = () => {
    if (audioBlob && onSend) {
      onSend(audioBlob);
      toast({
        title: 'Voice Note Sent',
        description: 'Your voice note has been sent successfully.',
      });
      // Reset state
      setAudioBlob(null);
      setAudioUrl(null);
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
              className="bg-allo-primary hover:bg-allo-primary/80 text-white rounded-full w-12 h-12 flex items-center justify-center"
              onClick={handleSend}
            >
              <Send size={18} />
            </Button>
          </>
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
