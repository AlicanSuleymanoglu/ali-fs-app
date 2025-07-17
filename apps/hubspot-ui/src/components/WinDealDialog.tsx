import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog.tsx";
import { Button } from "./ui/button.tsx";
import FileUploader from './FileUploader.tsx';
import ClosedWonReasonForm from './ClosedWonReasonForm.tsx';
import { toast } from "sonner";
import { Task } from '../types/index.ts';
import { useNavigate } from 'react-router-dom';

interface WinDealDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    task: Task;
    onComplete: (taskId: string) => void;
}

const WinDealDialog: React.FC<WinDealDialogProps> = ({
    isOpen,
    onOpenChange,
    task,
    onComplete
}) => {
    const navigate = useNavigate();
    const [step, setStep] = useState<'contract' | 'reason' | 'success'>('contract');
    const [pendingFile, setPendingFile] = useState<File | null>(null);
    const [additionalNotes, setAdditionalNotes] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

    const handleFileUpload = async (file: File, notes?: string) => {
        if (!task.dealId) {
            toast.error("Cannot upload: Deal not found.");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('contract', file, file.name);
        formData.append('dealId', task.dealId);
        if (notes) formData.append('note', notes);

        try {
            const res = await fetch(`${BASE_URL}/api/meeting/${task.meetingId}/upload-contract`, {
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


    const handleReasonComplete = async () => {
        try {
            // Mark the task as completed
            if (onComplete) {
                await onComplete(task.id);
            }
            // Close the dialog
            onOpenChange(false);
            // Navigate to success page
            navigate('/contract-success');
        } catch (err) {
            console.error("Error completing win deal flow:", err);
            toast.error("Failed to complete win deal flow");
            // Still navigate to success page even on error
            navigate('/contract-success');
        }
    };

    const handleClose = () => {
        onOpenChange(false);
        // Reset state when dialog is closed
        setStep('contract');
        setPendingFile(null);
        setAdditionalNotes("");
        setIsUploading(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {step === 'contract' && "Upload Contract"}
                        {step === 'reason' && "Closed Won Reason"}
                        {step === 'success' && "Congratulations!"}
                    </DialogTitle>
                </DialogHeader>

                {step === 'contract' && (
                    <div className="space-y-6">
                        <FileUploader
                            onUpload={setPendingFile}
                            title="Upload Signed Contract"
                        />

                        <div className="mt-4">
                            <label className="block mb-1 font-medium" htmlFor="additional-notes">
                                Additional Contract Notes
                            </label>
                            <textarea
                                id="additional-notes"
                                className="w-full p-2 border border-gray-300 rounded"
                                rows={3}
                                value={additionalNotes}
                                onChange={(e) => setAdditionalNotes(e.target.value)}
                                placeholder="Add any relevant comments for the note…"
                            />
                        </div>

                        <Button
                            className="w-full mt-6"
                            onClick={async () => {
                                if (pendingFile) {
                                    await handleFileUpload(pendingFile, additionalNotes);
                                    setStep('reason');
                                } else {
                                    toast.error("Please upload a contract file.");
                                }
                            }}
                            disabled={!pendingFile || isUploading}
                        >
                            {isUploading ? "Uploading..." : "Next Step"}
                        </Button>

                    </div>
                )}

                {step === 'reason' && (
                    task.dealId ? (
                        <ClosedWonReasonForm
                            dealId={task.dealId}
                            onComplete={handleReasonComplete}
                        />
                    ) : (
                        <div className="text-red-500 text-center py-4">
                            No Deal ID found for this task. Please check the task data.
                        </div>
                    )
                )}

                {step === 'success' && (
                    <div className="text-center py-6">
                        <div className="text-5xl mb-6">🎊</div>
                        <h2 className="text-xl font-semibold mb-2">Deal Won!</h2>
                        <p className="text-gray-600 mb-6">
                            Congratulations on winning this deal! The contract has been uploaded and the deal has been marked as won.
                        </p>
                        <Button
                            onClick={handleClose}
                            className="w-full"
                        >
                            Close
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default WinDealDialog; 