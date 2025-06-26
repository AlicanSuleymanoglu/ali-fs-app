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
import { useMeetingContext } from '../context/MeetingContext.tsx';
import { refreshMeetings } from '../utils/refreshMeetings.ts';
import { useUser } from '../hooks/useUser.ts';

console.log("AddMeeting mounted");

const AddMeeting: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL;
  const { setMeetings } = useMeetingContext();
  const user = useUser();

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
  const [meetingType, setMeetingType] = useState<"Sales Meeting" | "Sales Followup">(
    isFollowUp ? "Sales Followup" : (prefilledData.meetingType || "Sales Meeting")
  );
  const [notes, setNotes] = useState(prefilledData.notes || "");
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  // Check if company selection is forced
  const forceCompany = prefilledData.forceCompany || false;

  // Prefill company data if needed
  useEffect(() => {
    if ((isFollowUp || forceCompany || isRescheduling) && prefilledData.companyName) {
      if (!prefilledData.companyId) {
        toast.error("Missing company ID for follow-up meeting");
        navigate(-1); // Use direct navigation here since handleBack isn't in deps
        return;
      }

      const company: Company = {
        id: prefilledData.companyId,
        name: prefilledData.companyName,
        address: prefilledData.companyAddress || 'Unknown Address'
      };
      setSelectedCompany(company);
    }
  }, [isFollowUp, forceCompany, isRescheduling, prefilledData, navigate]);

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
    const meetingTypeLabel = meetingType === "Sales Meeting" ? "Sales Meeting" : "Sales Followup";
    const title = `${meetingTypeLabel}`;

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
        internalNotes: notes || ""
      };

      try {
        const res = await fetch(`${BASE_URL}/api/meetings/${meetingId}/reschedule`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload),
        });
        console.log("Reschedule PATCH server responded", res.status);

        if (!res.ok) throw new Error("Failed to reschedule meeting");

        const data = await res.json();
        toast.success("Meeting rescheduled!");

        // Refresh meetings after successful rescheduling
        if (user?.user_id) {
          await refreshMeetings(user.user_id, setMeetings);
        }

        // Always navigate to dashboard after rescheduling
        navigate('/dashboard');
        return;
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
      meetingType: meetingTypeLabel,
      startTime: startMillis,  // ✔️
      endTime: endMillis,      // ✔️
      notes,
      dealId: prefilledData.dealId,
      contactId: prefilledData.contactId,
      contactPhone: prefilledData.contactPhone,
      internalNotes: prefilledData.internalNotes,
    };
    console.log("Submitting meeting", payload);

    try {
      const res = await fetch(`${BASE_URL}/api/meetings/create`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      console.log("Server responded", res.status);

      if (!res.ok) throw new Error('Failed to create meeting');


      // ✅ Mark previous meeting as completed if this is a follow-up
      if (isFollowUp && prefilledData.meetingId) {
        try {
          const completeRes = await fetch(`${BASE_URL}/api/meeting/${prefilledData.meetingId}/mark-completed`, {
            method: 'POST',
            credentials: 'include',
          });
          if (!completeRes.ok) throw new Error('Failed to mark original meeting as completed');
          console.log("✅ Original meeting marked as completed");
        } catch (err) {
          console.error("❌ Could not mark original meeting completed:", err);
          toast.error("Original meeting was not marked as completed.");
        }
      }

      if (isInPast) {
        toast.success("Past meeting logged as completed");
      } else {
        toast.success(isFollowUp ? "Follow-up scheduled" : "Meeting scheduled");
      }

      // Use the redirect URL from the response, or fallback to dashboard
      if (location.state?.isFollowUp) {
        // Multi-deal flow: go back to DealSelector if completedDeals exists
        if (location.state?.completedDeals && location.state?.meetingId && location.state?.dealId) {
          const updatedCompletedDeals = {
            ...location.state.completedDeals,
            [location.state.dealId]: 'followup'
          };
          // Save to sessionStorage
          const sessionCompleted = JSON.parse(sessionStorage.getItem('completedDeals') || '{}');
          sessionStorage.setItem('completedDeals', JSON.stringify({ ...sessionCompleted, ...updatedCompletedDeals }));
          navigate(`/meeting/${location.state.meetingId}/outcome`, {
            state: {
              completedDeals: updatedCompletedDeals,
              meetingId: location.state.meetingId
            }
          });
        } else {
          navigate('/dashboard');
        }
        return;
      }

      handleBack();
    } catch (err) {
      console.error("❌ Meeting creation failed", err);
      toast.error("Failed to schedule meeting");
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate);
      setIsCalendarOpen(false);
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

  // Fixing linter errors

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    // @ts-ignore
    setStartTime(e.target.value);
  };

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // @ts-ignore
    setNotes(e.target.value);
  };

  // UI logic
  const showCompanySelection = !forceCompany && !isFollowUp && !isRescheduling;
  const showMeetingTypeSelection = !isFollowUp && !forceCompany && !isRescheduling;
  const showMeetingTypeDisplay = isFollowUp;
  const showCompanyDetails = (forceCompany || isFollowUp || isRescheduling) && (selectedCompany || prefilledData.companyName);

  // Handle back navigation
  const handleBack = () => {
    // If we have a referrer in the state, go back to it
    if (location.state?.from) {
      navigate(location.state.from);
    } else {
      // Otherwise, use history.back() which is more flexible than hardcoding to dashboard
      navigate(-1);
    }
  };

  return (
    <div className="allo-page">
      <div className="w-full max-w-3xl mx-auto py-4">
        <div className="flex justify-start mb-6">
          <Button
            variant="outline"
            onClick={handleBack}
          >
            <ChevronLeft size={16} className="mr-1" />
            Back
          </Button>
        </div>

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
                    onValueChange={(value: "Sales Meeting" | "Sales Followup") => setMeetingType(value)}
                    className="flex flex-col space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Sales Meeting" id="meeting-type-sales" />
                      <Label htmlFor="meeting-type-sales" className="cursor-pointer">Sales Meeting</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="Sales Followup" id="meeting-type-followup" />
                      <Label htmlFor="meeting-type-followup" className="cursor-pointer">Sales Followup</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              {showMeetingTypeDisplay && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Meeting Type</Label>
                  <div className="text-sm bg-gray-50 border rounded p-2">Sales Followup</div>
                </div>
              )}

              <div className="space-y-2 md:col-span-2">
                <Label>Date <span className="text-red-500">*</span></Label>
                <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !date && "text-muted-foreground"
                      )}
                      onClick={() => setIsCalendarOpen(true)}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd.MM.yyyy") : <span>Select date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                    <Calendar
                      mode="single"
                      selected={date}
                      onSelect={handleDateSelect}
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
                  onChange={handleStartTimeChange}
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
                  onChange={handleNotesChange}
                  className="min-h-[100px]"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                className="allo-button"
                onClick={handleSubmit}
              >
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
