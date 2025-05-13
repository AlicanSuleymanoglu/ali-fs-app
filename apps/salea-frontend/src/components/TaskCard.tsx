
import React, { useState } from 'react';
import { Calendar, Phone, X, Calendar as CalendarIcon, CheckCircle, XCircle, Clock } from 'lucide-react';
import { format, isPast, isSameDay } from 'date-fns';
import { Task } from '../types/index.ts';
import { Card, CardContent } from '../components/ui/card.tsx';
import { useIsMobile } from '../hooks/use-mobile.tsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../components/ui/dialog.tsx";
import { Button } from "../components/ui/button.tsx";
import { useNavigate } from 'react-router-dom';
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.tsx";
import { Input } from "../components/ui/input.tsx";
import { useState as useStateDialog } from "react";
import { Label } from "../components/ui/label.tsx";

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onComplete?: (taskId: string) => void;
  onDisqualify?: (taskId: string, reason: string, otherReason?: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onComplete, onDisqualify }) => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");
  const [showDisqualifyDialog, setShowDisqualifyDialog] = useState(false);
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const isPastDue = task.dueDate && isPast(new Date(task.dueDate)) && !isSameDay(new Date(task.dueDate), new Date());

  const handleCardClick = () => {
    setIsDialogOpen(true);
    if (onClick) onClick();
  };

  const handleScheduleMeeting = () => {
    setIsDialogOpen(false);
    // If this task is scheduled, we also mark it as completed
    if (onComplete) onComplete(task.id);
    navigate('/add-meeting', {
      state: {
        companyName: task.restaurantName,
        companyId: `task-${task.id}`,
        contactName: task.contactName
      }
    });
  };

  const handleCall = () => {
    window.location.href = `tel:${task.phoneNumber}`;
    setIsDialogOpen(false);
  };

  const handleComplete = () => {
    setIsDialogOpen(false);
    if (onComplete) onComplete(task.id);
  };

  const openDisqualifyDialog = () => {
    setShowDisqualifyDialog(true);
    setIsDialogOpen(false);
  };

  const markDealAsClosedLost = async (dealId: string, reason: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/deal/${dealId}/close-lost`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_stage: "closedlost", // Make sure this matches the internal value in HubSpot
          closed_lost_reason: reason
        }),
      });

      if (!res.ok) throw new Error("Failed to mark deal as closed lost");

      console.log("✅ Deal marked as Closed Lost");
      toast.success("Deal marked as Closed Lost");
    } catch (err) {
      console.error("❌ Error marking deal as Closed Lost:", err);
      toast.error("Failed to update deal status");
    }
  };

  const handleDisqualify = async () => {
    if (!disqualifyReason) {
      toast.error("Please select a disqualification reason");
      return;
    }

    if (disqualifyReason === "Other" && !otherReason) {
      toast.error("Please provide details for the other reason");
      return;
    }

    // Disqualify the task
    if (onDisqualify) {
      onDisqualify(
        task.id,
        disqualifyReason,
        disqualifyReason === "Other" ? otherReason : undefined
      );
    }

    // ✅ Mark deal as Closed Lost
    if (task.dealId) {
      await markDealAsClosedLost(
        task.dealId,
        disqualifyReason === "Other" ? otherReason : disqualifyReason
      );
    }

    // ✅ Also mark task as completed (backend + UI)
    if (onComplete) {
      await onComplete(task.id);
    }


    toast.info(`Task for ${task.contactName} marked as disqualified`);
    setShowDisqualifyDialog(false);
  };


  return (
    <>
      <Card
        className={`cursor-pointer transition-all hover:shadow-md ${!task.isRead ? 'border-l-4 border-l-[#2E1813]' : ''}`}
        onClick={handleCardClick}
      >
        <CardContent className="p-2">
          <div className="flex flex-col">
            <div className="flex justify-between items-start">
              <h3
                className={`font-semibold text-xs ${isPastDue ? 'text-red-600' : ''}`}
              >
                {task.restaurantName}
              </h3>
              {isPastDue && (
                <div className="flex items-center gap-1 text-xs text-red-600">
                  <Clock className="h-3 w-3 text-red-600" />
                  <span></span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Actions for {task.restaurantName}</DialogTitle>
          </DialogHeader>

          <div className="text-sm space-y-2">
            <p>
              <span className="font-medium">Notes:</span>{" "}
              {task.body ? task.body.replace(/<[^>]+>/g, '').trim() : "N/A"}
            </p>
            <p><span className="font-medium">Restaurant:</span> {task.restaurantName || "N/A"}</p>
            <p><span className="font-medium">Contact:</span> {task.contactName || "N/A"}</p>
            <p><span className="font-medium">Phone:</span> {task.phoneNumber || "N/A"}</p>
            <p><span className="font-medium">Email:</span> {task.email || "N/A"}</p>
            <p>
              <span className="font-medium">Due Date:</span>{" "}
              {task.dueDate ? format(new Date(task.dueDate), 'MMM dd, yyyy') : "N/A"}
            </p>
            {isPastDue && (
              <p className="flex items-center gap-1 text-red-600">
                <Clock size={16} className="text-red-600" />
                <span>This task is overdue</span>
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              onClick={handleCall}
              className="w-full flex items-center justify-center"
              variant="outline"
              size="sm"
            >
              <Phone size={16} className="mr-1" />
              Call
            </Button>
            <Button
              onClick={handleScheduleMeeting}
              className="w-full flex items-center justify-center"
              variant="outline"
              size="sm"
            >
              <CalendarIcon size={16} className="mr-1" />
              Schedule Meeting
            </Button>
            <Button
              onClick={openDisqualifyDialog}
              className="w-full flex items-center justify-center"
              variant="outline"
              size="sm"
            >
              <XCircle size={16} className="mr-1" />
              Lose the Deal
            </Button>
            <Button
              onClick={handleComplete}
              className="w-full flex items-center justify-center"
              variant="outline"
              size="sm"
            >
              <CheckCircle size={16} className="mr-1" />
              Complete
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDisqualifyDialog} onOpenChange={setShowDisqualifyDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {task.contactName && task.contactName !== "Unknown Contact"
                ? `Actions for ${task.contactName}`
                : task.restaurantName && task.restaurantName !== "Unknown Restaurant"
                  ? `Actions for ${task.restaurantName}`
                  : "Task Details"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="disqualify-reason">Disqualification Reason</Label>
              <Select
                onValueChange={(value) => setDisqualifyReason(value)}
                value={disqualifyReason}
              >
                <SelectTrigger id="disqualify-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Too sophisticated/modern">Too sophisticated/modern</SelectItem>
                  <SelectItem value="Too expensive">Too expensive</SelectItem>
                  <SelectItem value="Too many features">Too many features</SelectItem>
                  <SelectItem value="No fit to the restaurant type">No fit to the restaurant type</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                  <SelectItem value="No interest">No interest</SelectItem>
                  <SelectItem value="Bad Timing">Bad Timing</SelectItem>
                  <SelectItem value="Works black">Works black</SelectItem>
                  <SelectItem value="Restaurant closed">Restaurant closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {disqualifyReason === "Other" && (
              <div className="space-y-2">
                <Label htmlFor="other-reason">Disqualification Reason - Other</Label>
                <Input
                  id="other-reason"
                  value={otherReason}
                  onChange={(e) => setOtherReason(e.target.value)}
                  placeholder="Please specify the reason"
                />
              </div>
            )}

            <Button
              onClick={handleDisqualify}
              className="w-full"
            >
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TaskCard;
