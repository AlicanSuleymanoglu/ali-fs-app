import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, FileText, CalendarIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { cn } from '../lib/utils.ts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog.tsx";
import { Button } from "../components/ui/button.tsx";
import { Label } from "../components/ui/label.tsx";
import { toast } from "sonner";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.tsx";
import { Calendar as CalendarComponent } from "../components/ui/calendar.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group.tsx";
import CompanySearch, { Company } from '../components/CompanySearch.tsx';
import { useMeetingContext } from '../context/MeetingContext.tsx';
import { useUser } from '../hooks/useUser.ts';

interface CompanyWithDeal extends Company {
  dealId?: string | null | undefined;
}

interface FloatingActionButtonProps {
  onCreateTask?: () => void;
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ onCreateTask }) => {
  const { id } = useParams<{ id: string }>();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreateMeetingDialogOpen, setIsCreateMeetingDialogOpen] = useState(false);
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithDeal | null>(null);
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState<Date | undefined>(undefined);
  const [meetingType, setMeetingType] = useState<"Sales Meeting" | "Sales Followup">("Sales Meeting");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const fabRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { meetings } = useMeetingContext();
  const meetingDetails = meetings.find(m => m.id === id);
  const user = useUser();
  const BASE_URL = import.meta.env.VITE_API_BASE_URL;

  const toggleOptions = () => setIsOpen(!isOpen);

  const handleCreateMeeting = () => {
    setIsOpen(false);
    setIsCreateMeetingDialogOpen(true);
  };

  const handleCreateTask = () => {
    setIsOpen(false);
    if (onCreateTask) {
      onCreateTask();
    } else {
      setIsCreateTaskDialogOpen(true);
    }
  };

  const handleSubmitTask = async () => {
    if (!selectedCompany || !taskDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    const scheduledDate = new Date(taskDate);
    scheduledDate.setHours(9, 0, 0, 0); // always 9:00am

    const payload = {
      taskDate: scheduledDate.getTime(),
      companyId: selectedCompany.id,
      contactId: selectedCompany.contactId,
      dealId: selectedCompany.dealId,
      companyName: selectedCompany.name,
      ownerId: user?.user_id,
      taskBody: taskNotes
    };

    try {
      const res = await fetch(`${BASE_URL}/api/hubspot/tasks/create`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to create task");

      toast.success(`Task scheduled for ${format(scheduledDate, 'dd.MM.yyyy')}`);
      setIsCreateTaskDialogOpen(false);
      setTaskDate(undefined);
      setTaskNotes("");
    } catch (err) {
      console.error("❌ Failed to schedule task:", err);
      toast.error("Failed to schedule follow-up task");
    }
  };

  const handleSubmitMeeting = async () => {
    if (!selectedCompany || !date || !startTime) {
      toast.error("Please fill in all required fields");
      return;
    }

    const meetingDate = new Date(date);
    const [hour, minute] = startTime.split(":").map(Number);
    meetingDate.setHours(hour, minute, 0, 0);
    const endDate = new Date(meetingDate);
    endDate.setHours(endDate.getHours() + 1);

    const payload = {
      title: meetingType,
      companyId: selectedCompany.id,
      dealId: selectedCompany.dealId || null,
      meetingType,
      startTime: meetingDate.getTime(),
      endTime: endDate.getTime(),
      notes,
    };

    try {
      const res = await fetch(`${BASE_URL}/api/meetings/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create meeting');

      const newMeeting = await res.json();
      console.log("✅ API Response:", newMeeting);

      if (!newMeeting?.meetingId) {
        console.error("❌ Invalid Meeting Response:", newMeeting);
        throw new Error('Failed to retrieve new meeting ID');
      }

      toast.success(`Meeting scheduled successfully`);

      // ✅ Use the isPastMeeting flag here
      if (newMeeting.isPastMeeting) {
        toast.success("Past meeting logged. Redirecting to outcome.");
        navigate(`/meeting/${newMeeting.meetingId}/outcome`);
        return;
      }

      // Reset form state only after successful creation
      setIsCreateMeetingDialogOpen(false);
      setSelectedCompany(null);
      setMeetingType("Sales Meeting");
      setDate(undefined);
      setStartTime("");
      setNotes("");
    } catch (err) {
      console.error("❌ Error creating meeting:", err);
      toast.error("Failed to schedule meeting");
    }
  };


  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 7; hour < 21; hour++) {
      for (let minute of [0, 30]) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        options.push(<option key={time} value={time}>{time}</option>);
      }
    }
    return options;
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-30" aria-hidden="true" />}

      <div ref={fabRef} className="fixed bottom-6 right-6 z-40">
        <div className="flex flex-col items-end space-y-4">
          {isOpen && (
            <div className="flex items-center">
              <span className="mr-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-[#2E1813] text-sm shadow-sm">Task</span>
              <button className="bg-black hover:bg-black/90 text-[#FF8769] rounded-full shadow-lg w-12 h-12 flex items-center justify-center" onClick={handleCreateTask}>
                <FileText size={20} />
              </button>
            </div>
          )}

          <div className="flex items-center">
            {isOpen && (
              <span className="mr-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-[#2E1813] text-sm shadow-sm">Meeting</span>
            )}
            <button className="bg-black hover:bg-black/90 text-[#FF8769] rounded-full shadow-lg w-14 h-14 flex items-center justify-center" onClick={isOpen ? handleCreateMeeting : toggleOptions}>
              {isOpen ? <Calendar size={24} /> : <Plus size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Meeting Dialog */}
      <Dialog open={isCreateMeetingDialogOpen} onOpenChange={setIsCreateMeetingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <CompanySearch onSelect={setSelectedCompany} value={selectedCompany} required />
            </div>

            <div className="space-y-2">
              <Label>Meeting Type <span className="text-red-500">*</span></Label>
              <RadioGroup
                value={meetingType}
                onValueChange={(value) => setMeetingType(value as "Sales Meeting" | "Sales Followup")}
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sales Meeting" id="meeting-type-sales" />
                  <Label htmlFor="meeting-type-sales">Sales Meeting</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sales Followup" id="meeting-type-followup" />
                  <Label htmlFor="meeting-type-followup">Sales Follow-up</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Date <span className="text-red-500">*</span></Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {date ? format(date, "dd.MM.yyyy") : <span>Select date</span>} </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => selectedDate && setDate(selectedDate)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time <span className="text-red-500">*</span></Label>
              <select id="start-time" className="w-full rounded-md border px-3 py-2 text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} required>
                <option value="" disabled>Select time</option>
                {generateTimeOptions()}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Add any internal notes about this meeting" value={notes} onChange={(e) => setNotes(e.target.value)} className="min-h-[100px]" />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSubmitMeeting} className="bg-[#2E1813] hover:bg-[#2E1813]/90 text-white">
                Schedule Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Task Dialog */}
      <Dialog open={isCreateTaskDialogOpen} onOpenChange={setIsCreateTaskDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <CompanySearch value={selectedCompany} onSelect={setSelectedCompany} required />
            <div>
              <Label>Optional Notes</Label>
              <Textarea value={taskNotes} onChange={(e) => setTaskNotes(e.target.value)} placeholder="Add any task notes..." />
            </div>
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {taskDate ? format(taskDate, "dd.MM.yyyy") : <span>Select date</span>} </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent mode="single" selected={date} onSelect={setTaskDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
            <Button onClick={handleSubmitTask} className="bg-[#2E1813] hover:bg-[#2E1813]/90 text-white">
              Create Task
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingActionButton;
