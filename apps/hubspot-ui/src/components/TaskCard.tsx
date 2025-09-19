import React, { useState, useEffect } from 'react';
import { Calendar, Phone, X, Calendar as CalendarIcon, CheckCircle, XCircle, Clock, Info } from 'lucide-react';
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
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover.tsx';
import { Calendar as CalendarComponent } from '../components/ui/calendar.tsx';
import WinDealDialog from './WinDealDialog.tsx';

interface TaskCardProps {
  task: Task;
  onClick?: () => void;
  onComplete: (taskId: string) => void;
  onDisqualify?: (taskId: string, reason: string, otherReason?: string) => void;
}

const REASONS_REQUIRING_DATE = [
  "Too sophisticated/modern",
  "Too expensive",
  "Hardware price",
  "Too many features",
  "Bad timing",
  "No interest",
  "Other"
];

const TaskCard: React.FC<TaskCardProps> = ({ task, onClick, onComplete, onDisqualify }) => {
  const navigate = useNavigate();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [showWinDealDialog, setShowWinDealDialog] = useState(false);
  const [disqualifyReason, setDisqualifyReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");
  const [showDisqualifyDialog, setShowDisqualifyDialog] = useState(false);
  const [newDueDate, setNewDueDate] = useState<Date | null>(null);
  const [showCalendar, setShowCalendar] = useState(false);
  const [showMeetingCalendar, setShowMeetingCalendar] = useState(false);
  const [selectedMeetingDate, setSelectedMeetingDate] = useState<Date | null>(null);
  const [selectedMeetingTime, setSelectedMeetingTime] = useState<string>("10:00");
  const [meetingNotes, setMeetingNotes] = useState<string>("");
  const [reattemptDate, setReattemptDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  // For month/year dropdowns in reattempt date picker
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => reattemptDate || new Date());
  const dropdownContainerClass = "flex flex-col sm:flex-row gap-2 mb-2 items-center justify-center";
  const dropdownClass = "px-3 py-2 rounded border text-base w-full sm:w-auto";
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

  const isPastDue = task.dueDate && isPast(new Date(task.dueDate)) && !isSameDay(new Date(task.dueDate), new Date());

  // Extract user note from task.body (after the standard prefix)
  let userNote = '';
  if (task.body) {
    const lower = task.body.toLowerCase();
    if (lower.startsWith('follow-up task')) {
      userNote = task.body.slice('Follow-Up Task'.length).trim();
    } else if (lower.startsWith('cancellation task')) {
      userNote = task.body.slice('Cancellation Task'.length).trim();
    }
    // Remove leading newlines if present
    userNote = userNote.replace(/^\n+/, '');
  }

  const handleCardClick = () => {
    setIsDialogOpen(true);
    if (onClick) onClick();
  };

  const handleScheduleMeetingClick = () => {
    setIsDialogOpen(false);
    setShowMeetingCalendar(true);
  };

  const handleMeetingDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedMeetingDate(date);
    }
  };

  const generateTimeOptions = () => {
    const options = [];
    const startHour = 7; // 7 AM
    const endHour = 21; // 9 PM
    for (let hour = startHour; hour < endHour; hour++) {
      for (let minute of [0, 30]) {
        const formattedHour = hour.toString().padStart(2, '0');
        const formattedMinute = minute.toString().padStart(2, '0');
        const timeValue = `${formattedHour}:${formattedMinute}`;
        options.push(
          <SelectItem key={timeValue} value={timeValue}>
            {timeValue}
          </SelectItem>
        );
      }
    }
    return options;
  };

  const handleScheduleMeeting = async () => {
    if (!selectedMeetingDate) {
      toast.error("Please select a date for the meeting");
      return;
    }

    const meetingDate = new Date(selectedMeetingDate);
    const [hour, minute] = selectedMeetingTime.split(":").map(Number);
    meetingDate.setHours(hour, minute, 0, 0);
    const endTime = new Date(meetingDate);
    endTime.setHours(endTime.getHours() + 1);

    const payload = {
      title: "Sales Followup",
      companyId: task.companyId || `task-${task.id}`,
      dealId: task.dealId,
      meetingType: "Sales Followup",
      startTime: meetingDate.getTime(),
      endTime: endTime.getTime(),
      internalNotes: meetingNotes || `Follow-up meeting for ${task.restaurantName}`,
      contactId: task.contactId,
    };

    try {
      // Create the meeting
      const res = await fetch(`${BASE_URL}/api/meetings/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create meeting');
      const newMeeting = await res.json();

      if (!newMeeting?.meetingId) {
        throw new Error('Failed to retrieve new meeting ID');
      }

      // ✅ Create Google Calendar event if Google is connected
      try {
        const googleConnectedRes = await fetch(`${BASE_URL}/api/google/connected`, {
          credentials: 'include'
        });
        const googleStatus = await googleConnectedRes.json();

        if (googleStatus.connected) {
          const contactName = task.contactName || '';
          const location = task.companyAddress || '';

          const googleEventPayload = {
            restaurantName: task.restaurantName,
            contactName,
            startTime: meetingDate.getTime(),
            endTime: endTime.getTime(),
            notes: meetingNotes || `Follow-up meeting for ${task.restaurantName}`,
            location
          };

          const googleRes = await fetch(`${BASE_URL}/api/google/calendar/meeting`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(googleEventPayload),
          });

          if (googleRes.ok) {
            console.log('✅ Google Calendar event created successfully');
          } else {
            console.error('❌ Failed to create Google Calendar event');
          }
        }
      } catch (err) {
        console.error('❌ Error creating Google Calendar event:', err);
        // Don't fail the main meeting creation if Google Calendar fails
      }

      // Mark the task as completed
      await onComplete(task.id);

      toast.success("Meeting scheduled and task marked as completed!");
      setShowMeetingCalendar(false);

      // Navigate to the meeting outcome page
      navigate(`/dashboard`);
    } catch (err) {
      console.error("Error scheduling meeting:", err);
      toast.error("Failed to schedule meeting");
    }
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

  const handlePostponeClick = () => {
    setShowCalendar(true);
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setNewDueDate(date);
    }
  };

  const handlePostpone = async () => {
    if (!newDueDate) {
      toast.error("Please select a new date to postpone the task");
      return;
    }

    try {
      const res = await fetch(`${BASE_URL}/api/tasks/${task.id}/postpone`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newDueDate: newDueDate.toISOString(),
        }),
      });

      if (!res.ok) throw new Error("Failed to postpone task");

      toast.success("Task postponed successfully");
      setShowCalendar(false);
      setIsDialogOpen(false);
    } catch (err) {
      console.error("❌ Error postponing task:", err);
      toast.error("Failed to postpone task");
    }
  };

  const markDealAsClosedLost = async (dealId: string, reason: string) => {
    try {
      let reattemptDateUnix: number | null = null;
      if (reattemptDate) {
        const midnightUTC = new Date(Date.UTC(
          reattemptDate.getFullYear(),
          reattemptDate.getMonth(),
          reattemptDate.getDate(),
          0, 0, 0, 0
        ));
        reattemptDateUnix = midnightUTC.getTime();
      }
      // First mark the deal as closed lost
      const res = await fetch(`${BASE_URL}/api/deal/${dealId}/close-lost`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deal_stage: "closedlost",
          closed_lost_reason: reason,
          reattempt_date: reattemptDateUnix,
        }),
      });

      if (!res.ok) throw new Error("Failed to mark deal as closed lost");

      // Then mark the task as completed
      if (onComplete) {
        await onComplete(task.id);
      }

      console.log("✅ Deal marked as Closed Lost");
      toast.success("Deal marked as Closed Lost");
    } catch (err) {
      console.error("❌ Error marking deal as Closed Lost:", err);
      toast.error("Failed to update deal status");
    }
  };

  const handleDisqualify = async () => {
    if (!disqualifyReason) {
      toast.error("Please select a closed lost reason");
      return;
    }

    // No extra text required for 'Other' reason

    // Reattempt date is now optional

    // Disqualify the task
    if (onDisqualify) {
      onDisqualify(
        task.id,
        disqualifyReason
      );
    }

    // Mark deal as Closed Lost (this will also mark the task as completed)
    if (task.dealId) {
      await markDealAsClosedLost(
        task.dealId,
        disqualifyReason
      );
    } else if (onComplete) {
      await onComplete(task.id);
    }

    toast.info(`Task for ${task.contactName} marked as disqualified`);
    setShowDisqualifyDialog(false);
  };

  const handleOtherReasonChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setOtherReason(e.currentTarget.value);
  };

  const handleWinDeal = () => {
    setShowWinDealDialog(true);
    setIsDialogOpen(false);
  };

  useEffect(() => {
    if (showDisqualifyDialog) {
      console.log('Disqualify Reason:', disqualifyReason);
    }
  }, [disqualifyReason, showDisqualifyDialog]);

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
            {userNote && (
              <div className="pt-2">
                <span className="font-medium">Notes:</span>
                <div className="whitespace-pre-line mt-1">{userNote}</div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2">
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
              onClick={handleScheduleMeetingClick}
              className="w-full flex items-center justify-center"
              variant="outline"
              size="sm"
            >
              <CalendarIcon size={16} className="mr-1" />
              Meeting
            </Button>
            <Button
              onClick={handlePostponeClick}
              className="w-full flex items-center justify-center"
              variant="outline"
              size="sm"
            >
              <Clock size={16} className="mr-1" />
              Postpone
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              onClick={handleWinDeal}
              className="w-full flex items-center justify-center"
              variant="outline"
              size="sm"
            >
              <CheckCircle size={16} className="mr-1" />
              Win the Deal
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
          </div>
        </DialogContent>
      </Dialog>

      {showCalendar && (
        <Dialog open={showCalendar} onOpenChange={setShowCalendar}>
          <DialogContent className="sm:max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle>Select New Date</DialogTitle>
            </DialogHeader>
            <CalendarComponent
              mode="single"
              selected={newDueDate || undefined}
              onSelect={handleDateSelect}
              initialFocus
              weekStartsOn={1}
            />
            <div className="flex justify-end pt-4">
              <Button onClick={handlePostpone} className="bg-[#2E1813] hover:bg-[#2E1813]/90 text-white">
                Confirm Postpone
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <Dialog open={showMeetingCalendar} onOpenChange={setShowMeetingCalendar}>
        <DialogContent className="sm:max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Date</Label>
              <CalendarComponent
                mode="single"
                selected={selectedMeetingDate || undefined}
                onSelect={handleMeetingDateSelect}
                initialFocus
                weekStartsOn={1}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-time">Select Time</Label>
              <Select
                value={selectedMeetingTime}
                onValueChange={setSelectedMeetingTime}
              >
                <SelectTrigger id="meeting-time">
                  <SelectValue placeholder="Select time" />
                </SelectTrigger>
                <SelectContent>
                  {generateTimeOptions()}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meeting-notes">Meeting Notes</Label>
              <textarea
                id="meeting-notes"
                className="w-full min-h-[100px] p-2 border rounded-md"
                placeholder="Add any notes or details about the meeting..."
                value={meetingNotes}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMeetingNotes(e.currentTarget.value)}
              />
            </div>
            <div className="flex justify-end pt-4">
              <Button
                onClick={handleScheduleMeeting}
                className="bg-[#2E1813] hover:bg-[#2E1813]/90 text-white"
                disabled={!selectedMeetingDate}
              >
                Schedule Meeting
              </Button>
            </div>
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
              <Label htmlFor="disqualify-reason">Closed Lost Reason</Label>
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
                  <SelectItem value="Hardware price">Hardware price</SelectItem>
                  <SelectItem value="Too many features">Too many features</SelectItem>
                  <SelectItem value="No fit to the restaurant type">No fit to the restaurant type</SelectItem>
                  <SelectItem value="No interest">No interest</SelectItem>
                  <SelectItem value="Bad timing">Bad timing</SelectItem>
                  <SelectItem value="Works black">Works black</SelectItem>
                  <SelectItem value="Restaurant closed">Restaurant closed</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {REASONS_REQUIRING_DATE.includes(disqualifyReason) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="reattempt-date">Reattempt Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <button type="button" className="p-0 m-0 bg-transparent border-0 cursor-pointer text-muted-foreground hover:text-foreground">
                        <Info className="h-4 w-4" aria-label="Info" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="max-w-xs text-sm p-3">
                      The reattempt date is optional. Set it if you think a follow-up with this restaurant should be scheduled at a later time.
                    </PopoverContent>
                  </Popover>
                </div>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={"w-full justify-start text-left font-normal" + (!reattemptDate ? " text-muted-foreground" : "")}
                      type="button"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {reattemptDate ? format(reattemptDate, "dd.MM.yyyy") : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    {/* Month/Year Dropdowns for easier navigation */}
                    <div className={dropdownContainerClass}>
                      <select
                        value={displayedMonth.getMonth()}
                        className={dropdownClass}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const newMonth = parseInt(e.currentTarget.value, 10);
                          setDisplayedMonth(new Date(displayedMonth.getFullYear(), newMonth, 1));
                        }}
                      >
                        {Array.from({ length: 12 }).map((_, i) => (
                          <option key={i} value={i}>{format(new Date(2000, i, 1), 'MMMM')}</option>
                        ))}
                      </select>
                      <select
                        value={displayedMonth.getFullYear()}
                        className={dropdownClass}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                          const newYear = parseInt(e.currentTarget.value, 10);
                          setDisplayedMonth(new Date(newYear, displayedMonth.getMonth(), 1));
                        }}
                      >
                        {Array.from({ length: 30 }).map((_, i) => {
                          const year = new Date().getFullYear() + i;
                          return <option key={year} value={year}>{year}</option>;
                        })}
                      </select>
                    </div>
                    <CalendarComponent
                      mode="single"
                      selected={reattemptDate || undefined}
                      onSelect={(date) => {
                        setReattemptDate(date ?? null);
                        setCalendarOpen(false);
                      }}
                      fromDate={new Date()}
                      initialFocus
                      month={displayedMonth}
                      onMonthChange={setDisplayedMonth}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            <Button
              onClick={handleDisqualify}
              className="w-full"
            >
              Lose the Deal
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <WinDealDialog
        isOpen={showWinDealDialog}
        onOpenChange={setShowWinDealDialog}
        task={task}
        onComplete={onComplete}
      />
    </>
  );
};

export default TaskCard;
