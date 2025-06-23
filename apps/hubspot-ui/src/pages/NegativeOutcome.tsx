import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { toast } from "sonner";
import AudioRecorder from '../components/AudioRecorder.tsx';
import ClosedLostReasonForm from '../components/ClosedLostReasonForm.tsx';
import { useMeetingContext } from '../context/MeetingContext.tsx'; // if using context
import { useUser } from '../hooks/useUser.ts';
import { refreshMeetings } from '../utils/refreshMeetings.ts';
import { Textarea } from "../components/ui/textarea.tsx";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group.tsx";
import { Label } from "../components/ui/label.tsx";

const NegativeOutcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";
  // 1. Try navigation state
  const navDealId = location.state?.dealId;
  // 2. Try context
  const { meetings, setMeetings } = useMeetingContext();
  const contextDealId = meetings.find(m => m.id === id)?.dealId;

  // 3. Local state, preferring nav > context
  const [dealId, setDealId] = useState<string | null>(navDealId || contextDealId || null);
  const [loadingDealId, setLoadingDealId] = useState<boolean>(!dealId);
  const meetingDetails = meetings.find(m => m.id === id);
  const user = useUser();
  const ownerId = meetingDetails?.ownerId || user?.user_id;

  // Only fetch if missing from nav/context
  useEffect(() => {
    if (!dealId && id) {
      const fetchDealId = async () => {
        setLoadingDealId(true);
        try {
          const res = await fetch(`${BASE_URL}/api/meeting/${id}/deal`, {
            credentials: "include",
          });
          if (!res.ok) throw new Error("Failed to fetch dealId");
          const data = await res.json();
          if (data.dealId) setDealId(data.dealId);
          else setDealId(null);
        } catch (err) {
          toast.error("Could not find associated deal.");
          setDealId(null);
        } finally {
          setLoadingDealId(false);
        }
      };
      fetchDealId();
    }
  }, [id, dealId]);

  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [step, setStep] = useState<'voice' | 'reason'>('voice');
  const [inputMethod, setInputMethod] = useState<'audio' | 'text'>('audio');
  const [textInput, setTextInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleAudioSend = async (blob: Blob) => {
    setAudioBlob(blob);
    const formData = new FormData();

    formData.append('audio', blob, 'voice-note.webm');

    // ✅ Add metadata
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
      setStep('reason');
    } catch (err) {
      toast.error("Failed to send voice note");
      console.error("Backend error:", err);
    }
  };

  const handleTextSubmit = async () => {
    if (!textInput.trim()) {
      toast.error("Please enter some text before submitting");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${BASE_URL}/api/company/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          note: textInput,
          companyId: meetingDetails?.companyId,
          dealId: meetingDetails?.dealId,
          contactId: meetingDetails?.contactId,
        }),
      });

      if (!response.ok) throw new Error('Failed to send text note');
      toast.success("Note sent successfully");
      setStep('reason');
    } catch (err) {
      toast.error("Failed to send note");
      console.error("Backend error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleComplete = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/meeting/${id}/mark-completed`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark meeting as completed");

      // Refresh meetings once at the end of the flow
      if (user?.user_id) {
        await refreshMeetings(user.user_id, setMeetings);
      }

      toast.success("Meeting marked as negative outcome and completed!");
      if (location.state?.completedDeals) {
        // Multi-deal flow: go back to selector
        navigate(`/meeting/${id}/outcome`, {
          state: {
            completedDealId: dealId,
            completedDealStatus: 'closed-lost',
            completedDeals: location.state.completedDeals
          }
        });
      } else {
        // Single deal: go to dashboard
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error("Failed to mark meeting as completed");
      console.error("Error marking meeting as completed:", err);
      // Still try to refresh meetings even if marking as completed failed
      if (user?.user_id) {
        try {
          await refreshMeetings(user.user_id, setMeetings);
        } catch (refreshErr) {
          console.error("Error refreshing meetings:", refreshErr);
        }
      }
      if (location.state?.completedDeals) {
        navigate(`/meeting/${id}/outcome`, {
          state: {
            completedDealId: dealId,
            completedDealStatus: 'closed-lost',
            completedDeals: location.state.completedDeals
          }
        });
      } else {
        navigate('/dashboard', {
          state: {
            meetingId: id,
            completedDeals: location.state?.completedDeals
          }
        });
      }
    }
  };

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
          <h2 className="text-xl font-semibold mb-8 text-center">Negative Outcome</h2>

          {step === 'voice' && (
            <div className="allo-card mb-6">
              <div className="mb-6">
                <RadioGroup
                  defaultValue="audio"
                  value={inputMethod}
                  onValueChange={(value) => setInputMethod(value as 'audio' | 'text')}
                  className="flex gap-4 justify-center"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="audio" id="audio" />
                    <Label htmlFor="audio">Voice Recording</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="text" id="text" />
                    <Label htmlFor="text">Granola Note</Label>
                  </div>
                </RadioGroup>
              </div>

              {inputMethod === 'audio' && (
                <AudioRecorder onSend={handleAudioSend} />
              )}

              {inputMethod === 'text' && (
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter your note here..."
                    value={textInput}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setTextInput(e.target.value)}
                    className="min-h-[150px]"
                  />
                  <Button
                    onClick={handleTextSubmit}
                    disabled={isSubmitting || !textInput.trim()}
                    className="w-full"
                  >
                    {isSubmitting ? "Sending..." : "Send Note"}
                  </Button>
                </div>
              )}
            </div>
          )}

          {step === 'reason' && loadingDealId && (
            <div className="p-4 text-center">Loading deal info…</div>
          )}

          {step === 'reason' && !loadingDealId && dealId && (
            <ClosedLostReasonForm
              dealId={dealId}
              onComplete={handleComplete}
            />
          )}

          {step === 'reason' && !loadingDealId && !dealId && (
            <div className="text-red-500 p-4 text-center">
              No associated deal found for this meeting.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NegativeOutcome;
