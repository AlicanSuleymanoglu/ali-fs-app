import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import AudioRecorder from '../components/AudioRecorder.tsx';
import FileUploader from '../components/FileUploader.tsx';
import { toast } from "sonner";
import ClosedWonReasonForm from '../components/ClosedWonReasonForm.tsx';
import { useMeetingContext } from '../context/MeetingContext.tsx';

const PositiveOutcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const navDealId = location.state?.dealId;
  const { meetings } = useMeetingContext?.() || { meetings: [] };
  const contextDealId = meetings.find(m => m.id === id)?.dealId;

  const [dealId, setDealId] = useState<string | null>(navDealId || contextDealId || null);
  const [loadingDealId, setLoadingDealId] = useState<boolean>(!dealId);
  const [step, setStep] = useState<'contract' | 'voice' | 'reason'>('contract');
  const [contractUploaded, setContractUploaded] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [audioUploading, setAudioUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

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

  const handleFileUpload = async (file: File, notes?: string) => {
    if (!dealId) {
      toast.error("Cannot upload: Deal not found.");
      return;
    }

    const formData = new FormData();
    formData.append('contract', file, file.name);
    formData.append('dealId', dealId);
    if (notes) formData.append('note', notes);

    try {
      const res = await fetch(`${BASE_URL}/api/meeting/${id}/upload-contract`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to upload contract');
      toast.success("Contract uploaded and attached to the deal!");
    } catch (err) {
      toast.error("Failed to upload contract");
      console.error(err);
    }
  };

  const handleAudioSend = async (audioBlob: Blob) => {
    if (!dealId) {
      toast.error("No associated deal found for this meeting.");
      return;
    }

    setAudioUploading(true);
    const formData = new FormData();
    formData.append('audio', audioBlob, 'voice-note.webm');
    formData.append('dealId', dealId);

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
    } finally {
      setAudioUploading(false);
    }
  };

  const handleNextStep = async () => {
    if (!pendingFile) {
      toast.error("Please upload a contract before proceeding.");
      return;
    }

    await handleFileUpload(pendingFile, additionalNotes);
    setContractUploaded(true);
    setStep('voice');
  };

  const handleComplete = async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/meeting/${id}/mark-completed`, {
        method: "POST",
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to mark meeting as completed");
      toast.success("Meeting marked as positive outcome and completed!");
      // Navigate to success page instead of dashboard
      navigate('/contract-success');
    } catch (err) {
      toast.error("Failed to mark meeting as completed");
      console.error("Error marking meeting as completed:", err);
      navigate('/contract-success'); // Navigate to success page on error as well
    }
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
          <h2 className="text-xl font-semibold mb-6 text-center">Positive Outcome</h2>

          {step === 'contract' && loadingDealId && (
            <div className="p-4 text-center">Loading deal info…</div>
          )}

          {step === 'contract' && !loadingDealId && !dealId && (
            <div className="text-red-500 p-4 text-center">
              No associated deal found for this meeting.
            </div>
          )}

          {step === 'contract' && !loadingDealId && dealId && (
            <div className="space-y-6">
              <FileUploader
                onUpload={setPendingFile}
                title="Upload Signed Contract"
              />

              <div className="mt-4">
                <label className="block mb-1 font-medium" htmlFor="additional-notes">Additional Contract Notes</label>
                <textarea
                  id="additional-notes"
                  className="w-full p-2 border border-gray-300 rounded"
                  rows={3}
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="Add any relevant comments for the note…"
                />
              </div>

              <Button
                className="allo-button w-full mt-6"
                onClick={handleNextStep}
              >
                Next Step
                <ArrowRight size={16} className="ml-1" />
              </Button>
            </div>
          )}

          {step === 'voice' && (
            <div className="allo-card mb-6">
              <AudioRecorder onSend={handleAudioSend} />
              {audioUploading && (
                <div className="text-center text-allo-muted mt-2">
                  Uploading audio note…
                </div>
              )}
            </div>
          )}

          {step === 'reason' && loadingDealId && (
            <div className="p-4 text-center">Loading deal info…</div>
          )}

          {step === 'reason' && !loadingDealId && dealId && (
            <ClosedWonReasonForm
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

export default PositiveOutcome;
