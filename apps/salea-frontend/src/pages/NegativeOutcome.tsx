import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { toast } from "sonner";
import AudioRecorder from '../components/AudioRecorder.tsx';
import ClosedLostReasonForm from '../components/ClosedLostReasonForm.tsx';
import { useMeetingContext } from '../context/MeetingContext.tsx'; // if using context

const NegativeOutcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  // 1. Try navigation state
  const navDealId = location.state?.dealId;
  // 2. Try context
  const { meetings } = useMeetingContext?.() || { meetings: [] }; // context may be optional
  const contextDealId = meetings.find(m => m.id === id)?.dealId;

  // 3. Local state, preferring nav > context
  const [dealId, setDealId] = useState<string | null>(navDealId || contextDealId || null);
  const [loadingDealId, setLoadingDealId] = useState<boolean>(!dealId);

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

  const handleAudioSend = async (blob: Blob) => {
    setAudioBlob(blob);

    // Build FormData for file upload
    const formData = new FormData();
    formData.append('audio', blob, 'voice-note.webm'); // Use the correct extension
    console.log('Audio blob:', blob); // Log the blob instead of undefined req.file
    console.log('Forwarding audio to Zapier...');
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

  const handleComplete = async () => {
    // Step 1: Mark meeting as completed in backend (and HubSpot)
    try {
      const response = await fetch(`${BASE_URL}/api/meeting/${id}/mark-completed`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark meeting as completed");
      toast.success("Meeting marked as negative outcome and completed!");
    } catch (err) {
      toast.error("Failed to mark meeting as completed");
      console.error("Error marking meeting as completed:", err);
    }
    // Step 2: Navigate away
    navigate('/dashboard');
  };


  return (
    <div className="allo-page">
      <div className="allo-container">
        <Button
          variant="outline"
          className="self-start mb-6"
          onClick={() => navigate('/dashboard')}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Meetings
        </Button>

        <div className="w-full max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-8 text-center">Negative Outcome</h2>

          {step === 'voice' && (
            <div className="allo-card mb-6">
              <AudioRecorder onSend={handleAudioSend} />
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
