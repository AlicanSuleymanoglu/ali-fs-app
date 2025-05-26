import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Home, Clock, Calendar as CalendarIcon, Check, Mic } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { toast } from "sonner";
import AudioRecorder from '../components/AudioRecorder.tsx';
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.tsx";
import { Calendar } from "../components/ui/calendar.tsx";
import { format } from "date-fns";
import { cn } from "../lib/utils.ts";
import { useMeetingContext } from '../context/MeetingContext.tsx';
import { useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser.ts';
import { refreshMeetings } from '../utils/refreshMeetings.ts';

const FollowUpOutcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [showTaskOptions, setShowTaskOptions] = useState(false);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [showDateSelector, setShowDateSelector] = useState(false);
  const location = useLocation();
  const isHotDeal = location.state?.isHotDeal || false;
  const dealId = location.state?.dealId || null;
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

  const { meetings, setMeetings } = useMeetingContext();
  const meetingDetails = meetings.find(m => m.id === id);
  const user = useUser();
  const ownerId = meetingDetails?.ownerId || user?.user_id;

  const [isCompleted, setIsCompleted] = useState(false);
  const [isVoiceNoteSent, setIsVoiceNoteSent] = useState(false);
  const [showTaskSuccess, setShowTaskSuccess] = useState(false);
  const [createdTaskDate, setCreatedTaskDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!meetingDetails) {
      toast.error("Meeting not found");
      navigate('/dashboard');
    }
  }, [meetingDetails, navigate]);

  useEffect(() => {
    if (meetingDetails && meetingDetails.completed) {
      setIsCompleted(true);
    }
  }, [meetingDetails]);

  const handleAudioSend = async (blob: Blob) => {
    setAudioBlob(blob);
    const formData = new FormData();

    formData.append('audio', blob, 'voice-note.webm');
    formData.append('userId', ownerId ?? 'unknown');
    formData.append('meetingId', meetingDetails?.id ?? '');
    formData.append('companyId', String(meetingDetails?.companyId ?? ''));
    formData.append('dealId', String(meetingDetails?.dealId ?? ''));
    formData.append('contactId', String(meetingDetails?.contactId ?? ''));

    try {
      const response = await fetch(`${BASE_URL}/api/meeting/send-voice`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) throw new Error('Failed to send audio to backend');
      toast.success("Voice note recorded and sent successfully");
      setIsVoiceNoteSent(true);
      // Navigate to the follow-up options page after successful recording
      navigate(`/meeting/${id}/follow-up-options`, {
        state: {
          isHotDeal,
          dealId,
          isVoiceNoteSent: true
        }
      });
    } catch (err) {
      toast.error("Failed to send voice note");
      console.error("Backend error:", err);
    }
  };

  // If we're coming back from the options page, don't show the recorder
  if (location.state?.isVoiceNoteSent) {
    navigate(`/meeting/${id}/follow-up-options`, {
      state: {
        isHotDeal,
        dealId,
        isVoiceNoteSent: true
      }
    });
    return null;
  }

  return (
    <div className="allo-page">
      <div className="allo-container">
        <Button
          variant="outline"
          className="self-start mb-6"
          onClick={() => navigate(`/meeting/${id}/outcome`)}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back
        </Button>

        <div className="w-full max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-6 text-center">Follow-Up Voice Note</h2>

          <div className="allo-card">
            <AudioRecorder onSend={handleAudioSend} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FollowUpOutcome;
