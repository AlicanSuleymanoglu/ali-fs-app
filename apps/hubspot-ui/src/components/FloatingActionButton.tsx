// NOTE: If you see TypeScript errors about DOM types (e.g., 'Property ... does not exist on type ...'), ensure your tsconfig.json includes "dom" in the "lib" array.
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
import { refreshMeetings } from '../utils/refreshMeetings.ts';

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
  const [selectedCompany, setSelectedCompany] = useState<CompanyWithDeal | null>(null);
  const [taskNotes, setTaskNotes] = useState("");
  const [taskDate, setTaskDate] = useState<Date | undefined>(undefined);
  const [meetingType, setMeetingType] = useState<"Sales Meeting" | "Sales Followup">("Sales Meeting");
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState("");
  const [notes, setNotes] = useState("");
  const [calendarOpen, setCalendarOpen] = useState(false);
  const fabRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { meetings, setMeetings } = useMeetingContext();
  const meetingDetails = meetings.find(m => m.id === id);
  const user = useUser();
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";
  const [additionalCompanies, setAdditionalCompanies] = useState<CompanyWithDeal[]>([]);
  const [showAddCompanySearch, setShowAddCompanySearch] = useState(false);
  const [loadingMeetingId, setLoadingMeetingId] = useState<string | null>(null);
  const [loadingMeetingPast, setLoadingMeetingPast] = useState<{ id: string, isPast: boolean } | null>(null);
  const [loadingTimeout, setLoadingTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleCreateMeeting = () => {
    setIsCreateMeetingDialogOpen(true);
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

    const allCompanies = [selectedCompany, ...additionalCompanies];
    const companyIds = allCompanies.map(c => c.id);
    const dealIds = allCompanies.map(c => c.dealId || null);

    const payload = {
      title: meetingType,
      companyId: selectedCompany.id,
      dealId: selectedCompany.dealId || null,
      meetingType,
      startTime: meetingDate.getTime(),
      endTime: endDate.getTime(),
      notes,
      contactId: selectedCompany.contactId || null,
      companyIds,
      dealIds,
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

      // If meeting is in the past, show loading and then redirect to outcome page
      if (newMeeting.isPastMeeting) {
        setLoadingMeetingPast({ id: newMeeting.meetingId, isPast: true });
        setTimeout(async () => {
          try {
            if (user?.user_id) {
              // Refresh meetings context (like dashboard)
              await refreshMeetings(user.user_id, setMeetings);
            }
            // Redirect to MeetingActions page for the new meeting
            navigate(`/meeting/${newMeeting.meetingId}`);
          } catch (err) {
            toast.error('Could not refresh meetings after creation. Redirecting to dashboard.');
            navigate('/dashboard');
          }
        }, 10000);
        return;
      }
      // Otherwise, show loading and redirect to dashboard as before
      setLoadingMeetingId(newMeeting.meetingId);
      const meetingDateObj = new Date(date);
      const [hour2, minute2] = startTime.split(":").map(Number);
      meetingDateObj.setHours(hour2, minute2, 0, 0);
      const formattedDate = meetingDateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
      const formattedTime = meetingDateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
      const isoDate = meetingDateObj.toISOString().split('T')[0];
      setTimeout(async () => {
        if (user?.user_id) {
          await refreshMeetings(user.user_id, setMeetings);
        }
        window.location.replace(`/dashboard?selectedDate=${isoDate}`);
      }, 10000);
      setLoadingMeetingId(`${newMeeting.meetingId}|${formattedDate}|${formattedTime}`);
      return;
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

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = (e.target as HTMLSelectElement).value;
    setStartTime(value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = (e.target as HTMLTextAreaElement).value;
    setNotes(value);
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

  // Loading UI for past meeting creation
  if (loadingMeetingPast) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80">
        <div className="flex flex-col items-center gap-4 p-8 rounded shadow bg-white border">
          <span className="text-lg font-semibold">Creating meeting in HubSpot...</span>
          <span className="animate-spin h-8 w-8 border-4 border-blue-300 border-t-transparent rounded-full"></span>
          <span className="text-gray-500 text-sm">Waiting for HubSpot to confirm meeting creation.<br />This may take a few seconds.</span>
          <span className="text-blue-700 text-sm mt-2">You will be redirected to the meeting outcome page.</span>
          <span className="text-xs text-gray-400 mt-2">The page will redirect automatically.</span>
        </div>
      </div>
    );
  }
  if (loadingMeetingId) {
    // Parse meetingId, date, time
    let meetingInfo = loadingMeetingId.split('|');
    let meetingDateMsg = '';
    if (meetingInfo.length === 3) {
      meetingDateMsg = `You can find the meeting on the calendar on ${meetingInfo[1]} at ${meetingInfo[2]}.`;
    }
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80">
        <div className="flex flex-col items-center gap-4 p-8 rounded shadow bg-white border">
          <span className="text-lg font-semibold">Creating meeting in HubSpot...</span>
          <span className="animate-spin h-8 w-8 border-4 border-blue-300 border-t-transparent rounded-full"></span>
          <span className="text-gray-500 text-sm">Waiting for HubSpot to confirm meeting creation.<br />This may take a few seconds.</span>
          {meetingDateMsg && (
            <span className="text-blue-700 text-sm mt-2">{meetingDateMsg}</span>
          )}
          <span className="text-xs text-gray-400 mt-2">The page will refresh automatically.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-30" aria-hidden="true" />}

      <div ref={fabRef} className="fixed bottom-6 right-6 z-40">
        <div className="flex flex-col items-end space-y-4">
          <div className="flex items-center">
            {isOpen && (
              <span className="mr-2 bg-white/80 backdrop-blur-sm px-2 py-1 rounded text-[#2E1813] text-sm shadow-sm">Meeting</span>
            )}
            <button className="bg-black hover:bg-black/90 text-[#FF8769] rounded-full shadow-lg w-14 h-14 flex items-center justify-center" onClick={handleCreateMeeting}>
              {isOpen ? <Calendar size={24} /> : <Plus size={24} />}
            </button>
          </div>
        </div>
      </div>

      <Dialog open={isCreateMeetingDialogOpen} onOpenChange={setIsCreateMeetingDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Schedule New Meeting</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[80vh] overflow-y-auto">
            <div className="space-y-2">
              <CompanySearch onSelect={setSelectedCompany} value={selectedCompany} required />
            </div>

            <div className="space-y-2">
              {additionalCompanies.length > 0 && (
                <ul className="space-y-1">
                  {additionalCompanies.map((company, idx) => (
                    <li key={company.id} className="flex items-center justify-between bg-gray-50 rounded px-2 py-1">
                      <span>{company.name}</span>
                      <Button size="sm" variant="ghost" onClick={() => setAdditionalCompanies(prev => prev.filter((c, i) => i !== idx))}>
                        Remove
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
              {showAddCompanySearch ? (
                <div className="mt-2">
                  <CompanySearch
                    onSelect={company => {
                      if (
                        company.id === selectedCompany?.id ||
                        additionalCompanies.some(c => c.id === company.id)
                      ) {
                        toast.error("This restaurant is already added.");
                        return;
                      }
                      setAdditionalCompanies(prev => [...prev, company]);
                      setShowAddCompanySearch(false);
                    }}
                    disableContactCheck
                  />
                  <Button size="sm" variant="ghost" className="mt-1" onClick={() => setShowAddCompanySearch(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button size="sm" variant="outline" className="mt-2" onClick={() => setShowAddCompanySearch(true)}>
                  + Add more restaurants
                </Button>
              )}
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
              <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}> <CalendarIcon className="mr-2 h-4 w-4" /> {date ? format(date, "dd.MM.yyyy") : <span>Select date</span>} </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={date}
                    onSelect={(selectedDate) => {
                      if (selectedDate) {
                        setDate(selectedDate);
                        setCalendarOpen(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="start-time">Start Time <span className="text-red-500">*</span></Label>
              <select id="start-time" className="w-full rounded-md border px-3 py-2 text-sm" value={startTime} onChange={handleStartTimeChange} required>
                <option value="" disabled>Select time</option>
                {generateTimeOptions()}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" placeholder="Add any internal notes about this meeting" value={notes} onChange={handleNotesChange} className="min-h-[100px]" />
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSubmitMeeting} className="bg-[#2E1813] hover:bg-[#2E1813]/90 text-white">
                Schedule Meeting
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FloatingActionButton;
