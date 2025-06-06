import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ArrowRight } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import AudioRecorder from '../components/AudioRecorder.tsx';
import FileUploader from '../components/FileUploader.tsx';
import { toast } from "sonner";
import ClosedWonReasonForm from '../components/ClosedWonReasonForm.tsx';
import { useMeetingContext } from '../context/MeetingContext.tsx';
import { useUser } from '../hooks/useUser.ts';
import { refreshMeetings } from '../utils/refreshMeetings.ts';
import { Textarea } from "../components/ui/textarea.tsx";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group.tsx";
import { Label } from "../components/ui/label.tsx";

const PositiveOutcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

  const navDealId = location.state?.dealId;
  const { meetings, setMeetings } = useMeetingContext();
  const meetingDetails = meetings.find(m => m.id === id);
  const user = useUser();
  const ownerId = meetingDetails?.ownerId || user?.user_id;
  const contextDealId = meetings.find(m => m.id === id)?.dealId;
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const [dealId, setDealId] = useState<string | null>(navDealId || contextDealId || null);
  const [loadingDealId, setLoadingDealId] = useState<boolean>(!dealId);
  const [step, setStep] = useState<'contract' | 'voice' | 'reason'>('contract');
  const [contractUploaded, setContractUploaded] = useState(false);
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [audioUploading, setAudioUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [inputMethod, setInputMethod] = useState<'audio' | 'text'>('audio');
  const [textInput, setTextInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

    setIsUploading(true);
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
    } finally {
      setIsUploading(false);
    }
  };

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

      // Refresh meetings once at the end of the flow
      if (user?.user_id) {
        await refreshMeetings(user.user_id, setMeetings);
      }

      toast.success("Meeting marked as positive outcome and completed!");
      navigate('/contract-success');
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
      navigate('/contract-success');
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
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAdditionalNotes(e.target.value)}
                  placeholder="Add any relevant comments for the note…"
                />
              </div>

              <Button
                className="allo-button w-full mt-6"
                onClick={handleNextStep}
                disabled={!pendingFile || isUploading}
              >
                {isUploading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </div>
                ) : (
                  <>
                    Next Step
                    <ArrowRight size={16} className="ml-1" />
                  </>
                )}
              </Button>
            </div>
          )}

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
                    onChange={(e) => setTextInput(e.currentTarget.value)}
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
