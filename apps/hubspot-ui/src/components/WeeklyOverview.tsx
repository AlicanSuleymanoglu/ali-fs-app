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
import UserProfile from './UserProfile.tsx';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { useUser } from '../hooks/useUser.ts';

interface WeeklyOverviewProps {
  currentDate: Date;
  tasks: Task[];
  meetings: Meeting[];
  onDateSelect: (date: Date) => void;
}

const WeeklyOverview: React.FC<WeeklyOverviewProps> = ({
  currentDate,
  tasks,
  meetings,
  onDateSelect
}) => {
  const { meetings: contextMeetings, setMeetings } = useMeetingContext();
  const [weekOffset, setWeekOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);
  const user = useUser();
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

  // Add debug logging for meetings prop changes
  useEffect(() => {
    console.log('Meetings prop updated:', meetings.length);
  }, [meetings]);

  // Add debug logging for context meetings changes
  useEffect(() => {
    console.log('Context meetings updated:', contextMeetings.length);
  }, [contextMeetings]);

  const displayedWeek = useMemo(() => {
    let baseDate = currentDate;
    if (weekOffset > 0) {
      baseDate = addWeeks(currentDate, weekOffset);
    } else if (weekOffset < 0) {
      baseDate = subWeeks(currentDate, Math.abs(weekOffset));
    }
    return baseDate;
  }, [currentDate, weekOffset]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(displayedWeek, { weekStartsOn: 1 }); // Start on Monday
    return Array.from({ length: 7 }).map((_, i) => addDays(start, i));
  }, [displayedWeek]);

  const getMeetingsForDay = (date: Date) => {
    // Use meetings from props or context, and filter out canceled meetings
    const allMeetings = meetings.length > 0 ? meetings : contextMeetings;
    const dayMeetings = allMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return isSameDay(meetingDate, date) && meeting.status !== "CANCELED";
    });
    console.log(`Meetings for ${date.toISOString()}:`, dayMeetings.length);
    return dayMeetings;
  };

  const getTasksForDay = (date: Date) => {
    return tasks.filter(task => {
      const taskDate = new Date(task.createdAt);
      return isSameDay(taskDate, date);
    });
  };

  const goToPreviousWeek = () => {
    setWeekOffset(prev => prev - 1);
  };

  const goToNextWeek = () => {
    setWeekOffset(prev => prev + 1);
  };

  const goToToday = () => {
    setWeekOffset(0);
    onDateSelect(new Date());
  };

  const handleDayClick = (day: Date) => {
    console.log('Day clicked:', day.toISOString());
    onDateSelect(day);
    setWeekOffset(0);

    // Optionally, notify if the day is outside the cached range
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const rangeStart = subWeeksDate(currentWeekStart, 3); // 3 weeks before
    const rangeEnd = addWeeksDate(currentWeekStart, 2);   // 2 weeks after
    rangeEnd.setDate(rangeEnd.getDate() + 6); // Move to Sunday of that week
    rangeEnd.setHours(23, 59, 59, 999);

    const isWithinCachedRange = isWithinInterval(day, {
      start: rangeStart,
      end: rangeEnd
    });

    if (!isWithinCachedRange) {
      // Optionally show a toast or message
      // toast.info('Only meetings within the last 3 weeks and next 2 weeks are available.');
      console.log('Selected day is outside the cached range.');
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;

    const touchEndX = e.changedTouches[0].clientX;
    const diff = touchStartX.current - touchEndX;

    if (Math.abs(diff) > 50) {
      if (diff > 0) {
        goToNextWeek();
      } else {
        goToPreviousWeek();
      }
    }

    touchStartX.current = null;
  };

  const isCurrentDateToday = isToday(currentDate);
  const isTodayInCurrentWeek = weekDays.some(day => isToday(day));

  // Calculate the supported cached range
  const today = new Date();
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const rangeStart = subWeeksDate(currentWeekStart, 3); // 3 weeks before
  const rangeEnd = addWeeksDate(currentWeekStart, 3);   // 3 weeks after
  rangeEnd.setDate(rangeEnd.getDate() + 6); // Move to Sunday of that week
  rangeEnd.setHours(23, 59, 59, 999);

  // Check if the displayed week is within the cached range
  const displayedWeekStart = startOfWeek(displayedWeek, { weekStartsOn: 1 });
  const displayedWeekEnd = addDays(displayedWeekStart, 6);
  const isDisplayedWeekSupported =
    isWithinInterval(displayedWeekStart, { start: rangeStart, end: rangeEnd }) &&
    isWithinInterval(displayedWeekEnd, { start: rangeStart, end: rangeEnd });

  return (
    <div
      className="bg-white rounded-lg shadow-sm p-4 mb-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!isDisplayedWeekSupported && (
        <div className="mb-2 p-2 bg-yellow-100 text-yellow-800 text-xs rounded text-center">
          Currently only <b>Meetings</b> within <b>3 weeks</b> past or future are shown.
          Check HubSpot for more.
        </div>
      )}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold">
            {format(displayedWeek, 'MMMM')}
          </h2>
          {(!isCurrentDateToday || !isTodayInCurrentWeek) && (
            <button
              onClick={goToToday}
              className="flex items-center justify-center w-6 h-6 relative"
              aria-label="Go to today"
            >
              <Calendar className="h-5 w-5" />
            </button>
          )}
        </div>
        <UserProfile small />
      </div>

      <div className="grid grid-cols-9 gap-1 text-center items-center">
        <Button
          variant="ghost"
          size="sm"
          className="p-1 col-span-1"
          onClick={goToPreviousWeek}
          aria-label="Previous week"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="grid grid-cols-7 col-span-7 gap-1 text-center">
          {weekDays.map((day, index) => {
            const dayMeetings = getMeetingsForDay(day);
            const isSelected = isSameDay(day, currentDate);

            // Maximum 6 dots total with 3 per row
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
                <span className="text-xs uppercase">
                  {format(day, 'EEE')}
                </span>
                <span className={cn(
                  "w-8 h-8 flex items-center justify-center rounded-full my-1",
                  isToday(day) && "font-bold border border-[#FF8769]",
                  isSelected && "bg-[#FF8769] text-white"
                )}>
                  {format(day, 'd')}
                </span>

                {/* First row of dots */}
                <div className="flex gap-0.5 items-center justify-center h-2">
                  {Array.from({ length: Math.min(meetingDotsToShow, MAX_DOTS_PER_ROW) }).map((_, i) => (
                    <div
                      key={`meeting-row1-${i}`}
                      className="w-2 h-2 rounded-full bg-[#FF8769]"
                      title={`${dayMeetings.length} meetings`}
                    />
                  ))}
                </div>

                {/* Second row of dots (only shown if there are more than 3 dots) */}
                {meetingDotsToShow > MAX_DOTS_PER_ROW && (
                  <div className="flex gap-0.5 mt-0.5 items-center justify-center h-2">
                    {Array.from({ length: Math.min(meetingDotsToShow - MAX_DOTS_PER_ROW, MAX_DOTS_PER_ROW) }).map((_, i) => (
                      <div
                        key={`meeting-row2-${i}`}
                        className="w-2 h-2 rounded-full bg-[#FF8769]"
                        title={`${dayMeetings.length} meetings`}
                      />
                    ))}

                    {showPlus && (
                      <div className="w-2 h-2 flex items-center justify-center ml-0.5 font-bold text-[8px] text-gray-600"
                        title={`${dayMeetings.length} total meetings`}>
                        +
                      </div>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="p-1 col-span-1"
          onClick={goToNextWeek}
          aria-label="Next week"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default WeeklyOverview;
