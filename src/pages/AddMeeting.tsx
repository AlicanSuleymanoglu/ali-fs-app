import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from "../components/ui/button.tsx";
import { Label } from "../components/ui/label.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.tsx";
import { Calendar } from "../components/ui/calendar.tsx";
import { Textarea } from "../components/ui/textarea.tsx";
import { RadioGroup, RadioGroupItem } from "../components/ui/radio-group.tsx";
import { cn } from "../lib/utils.ts";
import { toast } from "sonner";
import CompanySearch, { Company } from '../components/CompanySearch.tsx';

console.log("AddMeeting mounted");

const AddMeeting: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Detect reschedule/followup
  const isRescheduling = location.pathname.includes('reschedule') || 
                        (location.state && location.state.isRescheduling);
  const isFollowUp = location.state && location.state.isFollowUp;

  // Get prefilled data if any
  const prefilledData = location.state || {};

  const [date, setDate] = useState<Date | undefined>(
    prefilledData.preselectedDate 
      ? new Date(prefilledData.preselectedDate) 
      : undefined
  );
  const [startTime, setStartTime] = useState("");
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [meetingType, setMeetingType] = useState<"sales meeting" | "sales followup">(
    isFollowUp ? "sales followup" : (prefilledData.meetingType || "sales meeting")
  );
  const [notes, setNotes] = useState(prefilledData.notes || "");

  // Check if company selection is forced
  const forceCompany = prefilledData.forceCompany || false;

  // Prefill company data if needed
  useEffect(() => {
    if ((isFollowUp || forceCompany || isRescheduling) && prefilledData.companyName) {
      const company: Company = {
        id: prefilledData.companyId || 'temp-id',
        name: prefilledData.companyName,
        address: prefilledData.companyAddress || 'Unknown Address'
      };
      setSelectedCompany(company);
    }
  }, [isFollowUp, forceCompany, isRescheduling, prefilledData]);

  // Process preselected times
  useEffect(() => {
    if (prefilledData.preselectedStartTime) {
      const startDate = new Date(prefilledData.preselectedStartTime);
      setStartTime(`${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`);
    }
  }, [prefilledData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submit triggered");
  
    if (!date || !startTime) {
      toast.error("Please select date and time");
      return;
    }
    if (!forceCompany && !isFollowUp && !selectedCompany) {
      toast.error("Please select a company");
      return;
    }
  
    const company = selectedCompany?.name || prefilledData.companyName || "Unknown Company";
    const meetingTypeLabel = meetingType === "sales meeting" ? "Meeting" : "Followup";
    const title = `allO x ${company} - ${meetingTypeLabel}`;
  
    // Calculate start/end
    const meetingDate = new Date(date);
    const [startHour, startMinute] = startTime.split(':').map(Number);
    meetingDate.setHours(startHour, startMinute, 0, 0);
  
    const endDate = new Date(meetingDate);
    endDate.setHours(endDate.getHours() + 1);
  
    // UNIX milliseconds
    const startMillis = meetingDate.getTime();
    const endMillis = endDate.getTime();
  
    const isInPast = meetingDate < new Date();
  
    if (isRescheduling) {
      // PATCH logic for rescheduling
      
      const meetingId = prefilledData.meetingId;
      if (!meetingId) {
        toast.error("Missing meeting ID for reschedule!");
        return;
      }
      const patchPayload = {
        startTime: meetingDate.toISOString(),
        endTime: endDate.toISOString(),
        notes: notes || ""
      };
      
      
      
      try {
        const res = await fetch(`http://localhost:3000/api/meetings/${meetingId}/reschedule`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload),
        });
        console.log("Reschedule PATCH server responded", res.status);
  
        if (!res.ok) throw new Error("Failed to reschedule meeting");
  
        toast.success("Meeting rescheduled!");
        navigate('/dashboard');
      } catch (err) {
        console.error("❌ Meeting reschedule failed", err);
        toast.error("Failed to reschedule meeting");
      }
      return;
    }
  
    // Normal POST (new or follow-up) — FIXED
    const payload = {
      title,
      companyId: selectedCompany?.id || prefilledData.companyId,
      meetingType,
      startTime: startMillis,  // ✔️
      endTime: endMillis,      // ✔️
      notes,
    };
    console.log("Submitting meeting", payload);
  
    try {
      const res = await fetch('http://localhost:3000/api/meetings/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log("Server responded", res.status);
  
      if (!res.ok) throw new Error('Failed to create meeting');
      if (isInPast) {
        toast.success("Past meeting logged as completed");
      } else {
        toast.success(isFollowUp ? "Follow-up scheduled" : "Meeting scheduled");
      }
      navigate('/dashboard');
    } catch (err) {
      console.error("❌ Meeting creation failed", err);
      toast.error("Failed to schedule meeting");
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
          <option key={timeValue} value={timeValue}>
            {timeValue}
          </option>
        );
      }
    }
    return options;
  };

  // UI logic
  const showCompanySelection = !forceCompany && !isFollowUp && !isRescheduling;
  const showMeetingTypeSelection = !isFollowUp && !forceCompany && !isRescheduling;
  const showMeetingTypeDisplay = isFollowUp;
  const showCompanyDetails = (forceCompany || isFollowUp || isRescheduling) && (selectedCompany || prefilledData.companyName);

  return (
    <div className="allo-page">
      <div className="w-full max-w-3xl mx-auto py-4">
        <Button 
          variant="outline" 
          className="mb-6"
          onClick={() => navigate('/dashboard')}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Meetings
        </Button>
        
        <div className="allo-card w-full">
          <h2 className="text-xl font-semibold mb-6">
            {isRescheduling 
              ? "Reschedule Meeting" 
              : isFollowUp 
                ? "Schedule Follow-up Meeting"
                : "Schedule New Meeting"}
          </h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {showCompanySelection && (
                <div className="md:col-span-2">
                  <CompanySearch 
                    onSelect={setSelectedCompany}
                    value={selectedCompany}
                    required={true}
                  />
                </div>
              )}
              
              {showCompanyDetails && (
                <div className="md:col-span-2">
                  <div className="border rounded-md p-3 bg-gray-50">
                    <Label className="block mb-1 text-sm">Company</Label>
                    <p className="font-medium">{selectedCompany?.name || prefilledData.companyName}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedCompany?.address || prefilledData.companyAddress || 'Address not available'}
                    </p>
                  </div>
                </div>
              )}
              
              {showMeetingTypeSelection && (
                <div className="md:col-span-2 space-y-2">
                  <Label>Meeting Type <span className="text-red-500">*</span></Label>
                  <RadioGroup 
                    defaultValue={meetingType}
                    onValueChange={(value: "sales meeting" | "sales followup") => setMeetingType(value)}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sales meeting" id="meeting-type-sales" />
                      <Label htmlFor="meeting-type-sales" className="cursor-pointer">Sales Meeting</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sales followup" id="meeting-type-followup" />
                      <Label htmlFor="meeting-type-followup" className="cursor-pointer">Sales Follow-up</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              
              {showMeetingTypeDisplay && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Meeting Type</Label>
                  <div className="text-sm bg-gray-50 border rounded p-2">Sales Follow-up</div>
                </div>
              )}
              
              <div className="space-y-2 md:col-span-2">
                <Label>Date <span className="text-red-500">*</span></Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd.MM.yyyy") : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={setDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="start-time">Start Time <span className="text-red-500">*</span></Label>
                <select
                  id="start-time"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                >
                  <option value="" disabled>Select time</option>
                  {generateTimeOptions()}
                </select>
              </div>
              
              <div className="md:col-span-2 space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea 
                  id="notes" 
                  placeholder="Add any internal notes about this meeting" 
                  value={notes} 
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px]"
                />
              </div>
            </div>
            
            <div className="flex justify-end pt-4">
              <Button type="submit" className="allo-button">
                {isRescheduling ? "Reschedule Meeting" : isFollowUp ? "Schedule Follow-up" : "Schedule Meeting"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddMeeting;
