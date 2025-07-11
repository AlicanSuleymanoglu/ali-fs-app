import React, { useState } from 'react';
import { Button } from "./ui/button.tsx";
import { Label } from "./ui/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select.tsx";
import { Input } from "./ui/input.tsx";
import { toast } from "sonner";
import { Loader2 } from 'lucide-react';
import { Calendar } from "./ui/calendar.tsx";
import { Dialog, DialogContent } from "./ui/dialog.tsx";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover.tsx";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from 'lucide-react';

interface ClosedLostReasonFormProps {
  dealId: string;           // 🚨 Make sure this is a string and not undefined!
  onComplete: () => void;
}

const REASONS_REQUIRING_DATE = [
  "Too sophisticated/modern",
  "Too expensive",
  "Too many features",
  "Bad timing",
  "No interest",
  "Other"
];

function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return /Mobi|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(window.navigator.userAgent);
}

const ClosedLostReasonForm: React.FC<ClosedLostReasonFormProps> = ({ dealId, onComplete }) => {
  const [reason, setReason] = useState<string>("");
  const [otherReason, setOtherReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [reattemptDate, setReattemptDate] = React.useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = React.useState(false);
  const [displayedMonth, setDisplayedMonth] = useState<Date>(() => reattemptDate || new Date());
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";


  console.log("dealId being passed to form:", dealId);

  const shouldShowReattemptDate = REASONS_REQUIRING_DATE.includes(reason);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dealId) {
      toast.error("No Deal ID found! Cannot update deal.");
      return;
    }

    if (!reason) {
      toast.error("Please select a reason");
      return;
    }

    setLoading(true);

    try {
      let reattemptDateUnix: number | null = null;
      if (shouldShowReattemptDate && reattemptDate) {
        const midnightUTC = new Date(Date.UTC(
          reattemptDate.getFullYear(),
          reattemptDate.getMonth(),
          reattemptDate.getDate(),
          0, 0, 0, 0
        ));
        reattemptDateUnix = midnightUTC.getTime(); // unix + three (ms)
      }
      const res = await fetch(`${BASE_URL}/api/deal/${dealId}/close-lost`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deal_stage: "closedlost",
          closed_lost_reason: reason,
          reattempt_date: reattemptDateUnix,
        }),
      });

      if (!res.ok) throw new Error("Failed to update deal");

      toast.success("Deal marked as lost with reason!");
      setLoading(false);
      onComplete();
    } catch (err) {
      toast.error("Failed to update deal");
      setLoading(false);
      console.error(err);
    }
  };

  // Responsive styles for mobile dropdowns
  const dropdownContainerClass = "flex flex-col sm:flex-row gap-2 mb-2 items-center justify-center";
  const dropdownClass = "px-3 py-2 rounded border text-base w-full sm:w-auto";

  return (
    <div className="allo-card w-full">
      <h2 className="text-xl font-semibold mb-6">Closed Lost Reason</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="closed-lost-reason">Reason <span className="text-red-500">*</span></Label>
            <Select
              onValueChange={setReason}
              value={reason}
              disabled={loading}
            >
              <SelectTrigger id="closed-lost-reason">
                <SelectValue placeholder="Select a reason" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Too sophisticated/modern">Too sophisticated/modern</SelectItem>
                <SelectItem value="Too expensive">Too expensive</SelectItem>
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
          {shouldShowReattemptDate && (
            <div className="space-y-2">
              <Label htmlFor="reattempt-date">Reattempt Date</Label>
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
                  <Calendar
                    mode="single"
                    selected={reattemptDate}
                    onSelect={(date) => {
                      setReattemptDate(date);
                      setCalendarOpen(false);
                    }}
                    fromDate={new Date()}
                    month={displayedMonth}
                    onMonthChange={setDisplayedMonth}
                    showOutsideDays
                    numberOfMonths={1}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}
        </div>
        <div className="flex justify-end pt-4">
          <Button type="submit" className="allo-button" disabled={loading || !reason}>
            {loading && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
            {loading ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ClosedLostReasonForm;
