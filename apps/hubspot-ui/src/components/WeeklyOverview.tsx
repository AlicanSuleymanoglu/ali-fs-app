import React, { useMemo, useState, useRef, useEffect } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  addWeeks,
  subWeeks,
  isWithinInterval,
  addWeeks as addWeeksDate,
  subWeeks as subWeeksDate
} from 'date-fns';
import { cn } from '../lib/utils.ts';
import { useMeetingContext } from '../context/MeetingContext.tsx';
import { Task } from '../types/index.ts';
import { Meeting } from '../components/MeetingCard.tsx';
import { ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react';
import { Button } from '../components/ui/button.tsx';

interface WeeklyOverviewProps {
  currentDate: Date;
  tasks: Task[];
  meetings: Meeting[];
  onDateSelect: (date: Date) => void;
  onFindMeetings?: () => void;
}

const WeeklyOverview: React.FC<WeeklyOverviewProps> = ({
  currentDate,
  tasks,
  meetings,
  onDateSelect,
  onFindMeetings
}) => {
  const { meetings: contextMeetings } = useMeetingContext();
  const [weekOffset, setWeekOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    console.log('Meetings prop updated:', meetings.length);
  }, [meetings]);

  useEffect(() => {
    console.log('Context meetings updated:', contextMeetings.length);
  }, [contextMeetings]);

  const displayedWeek = useMemo(() => {
    if (weekOffset > 0) return addWeeks(currentDate, weekOffset);
    if (weekOffset < 0) return subWeeks(currentDate, Math.abs(weekOffset));
    return currentDate;
  }, [currentDate, weekOffset]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(displayedWeek, { weekStartsOn: 1 });
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [displayedWeek]);

  const getMeetingsForDay = (date: Date) => {
    const allMeetings = meetings.length > 0 ? meetings : contextMeetings;
    return allMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return isSameDay(meetingDate, date) && meeting.status !== "CANCELED";
    });
  };

  const goToPreviousWeek = () => setWeekOffset(prev => prev - 1);
  const goToNextWeek = () => setWeekOffset(prev => prev + 1);
  const goToToday = () => {
    setWeekOffset(0);
    onDateSelect(new Date());
  };

  const handleDayClick = (day: Date) => {
    onDateSelect(day);
    setWeekOffset(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;
    if (Math.abs(diff) > 50) diff > 0 ? goToNextWeek() : goToPreviousWeek();
    touchStartX.current = null;
  };

  const isCurrentDateToday = isToday(currentDate);
  const isTodayInCurrentWeek = weekDays.some(day => isToday(day));

  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const rangeStart = subWeeksDate(currentWeekStart, 1);
  const rangeEnd = addWeeksDate(currentWeekStart, 1);
  rangeEnd.setDate(rangeEnd.getDate() + 6);
  rangeEnd.setHours(23, 59, 59, 999);

  const displayedWeekStart = startOfWeek(displayedWeek, { weekStartsOn: 1 });
  const displayedWeekEnd = addDays(displayedWeekStart, 6);
  const isDisplayedWeekSupported =
    isWithinInterval(displayedWeekStart, { start: rangeStart, end: rangeEnd }) &&
    isWithinInterval(displayedWeekEnd, { start: rangeStart, end: rangeEnd });

  return (
    <div
      className="bg-white rounded-lg shadow-sm p-4 mb-4 relative"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isDisplayedWeekSupported && (
        <div className="mb-2 p-2 bg-yellow-100 text-yellow-800 text-xs rounded text-center">
          You can fetch meetings for this day by clicking the "Fetch Meetings" button.
        </div>
      )}

      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">{format(displayedWeek, 'MMMM')}</h2>
          {(!isCurrentDateToday || !isTodayInCurrentWeek) && (
            <button
              onClick={goToToday}
              className="flex items-center justify-center w-6 h-6"
              aria-label="Go to today"
            >
              <Calendar className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-9 gap-1 text-center items-center">
        <Button variant="ghost" size="sm" className="p-1 col-span-1" onClick={goToPreviousWeek}>
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="grid grid-cols-7 col-span-7 gap-1 text-center">
          {weekDays.map((day, index) => {
            const dayMeetings = getMeetingsForDay(day);
            const isSelected = isSameDay(day, currentDate);
            const MAX_DOTS_PER_ROW = 3;
            const MAX_DOTS_TOTAL = 6;
            const meetingDotsToShow = Math.min(dayMeetings.length, MAX_DOTS_TOTAL);
            const showPlus = dayMeetings.length > MAX_DOTS_TOTAL;

            return (
              <button
                key={index}
                onClick={() => handleDayClick(day)}
                className={cn(
                  "flex flex-col items-center py-2 rounded-lg relative",
                  isSelected ? "bg-[#FF8769]/10" : "hover:bg-gray-100",
                  !isSameMonth(day, displayedWeek) && "text-gray-400"
                )}
              >
                <span className="text-xs uppercase">{format(day, 'EEE')}</span>
                <span className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full my-1",
                  isToday(day) && "font-bold border border-[#FF8769]",
                  isSelected && "bg-[#FF8769] text-white"
                )}>
                  {format(day, 'd')}
                </span>

                <div className="flex gap-0.5 items-center justify-center h-2">
                  {Array.from({ length: Math.min(meetingDotsToShow, MAX_DOTS_PER_ROW) }).map((_, i) => (
                    <div
                      key={`meeting-dot1-${i}`}
                      className="w-2 h-2 rounded-full bg-[#FF8769]"
                    />
                  ))}
                </div>

                {meetingDotsToShow > MAX_DOTS_PER_ROW && (
                  <div className="flex gap-0.5 mt-0.5 items-center justify-center h-2">
                    {Array.from({ length: Math.min(meetingDotsToShow - MAX_DOTS_PER_ROW, MAX_DOTS_PER_ROW) }).map((_, i) => (
                      <div
                        key={`meeting-dot2-${i}`}
                        className="w-2 h-2 rounded-full bg-[#FF8769]"
                      />
                    ))}
                    {showPlus && (
                      <div className="w-2 h-2 flex items-center justify-center ml-0.5 font-bold text-[8px] text-gray-600">
                        +
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button variant="ghost" size="sm" className="p-1 col-span-1" onClick={goToNextWeek}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeeklyOverview;
