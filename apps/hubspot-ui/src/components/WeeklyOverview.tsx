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
import { cn } from '@/lib/utils';
import { useMeetingContext } from '../context/MeetingContext';
import { Task } from '@/types';
import { Meeting } from '@/components/MeetingCard';
import UserProfile from './UserProfile';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '../hooks/useUser';

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
  const [calendarMeetings, setCalendarMeetings] = useState<Array<{ id: string; startTime: string; status: string }>>([]);

  // Fetch light mode meetings for calendar dots
  useEffect(() => {
    const fetchCalendarMeetings = async () => {
      if (!user?.user_id) return;

      try {
        const res = await fetch(`${import.meta.env.VITE_PUBLIC_API_BASE_URL}/api/meetings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ownerId: user.user_id,
            lightMode: true,
            forceRefresh: false
          })
        });

        if (!res.ok) {
          throw new Error('Failed to fetch calendar meetings');
        }

        const data = await res.json();
        setCalendarMeetings(data.results);
      } catch (err) {
        console.error("Failed to fetch calendar meetings:", err);
      }
    };

    fetchCalendarMeetings();
  }, [user?.user_id]);

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
    // Use calendarMeetings for dots, but filter out canceled meetings
    return calendarMeetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return isSameDay(meetingDate, date) && meeting.status !== "CANCELED";
    });
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

  const handleDayClick = async (day: Date) => {
    onDateSelect(day);
    setWeekOffset(0);

    // Calculate the date range for current week, next week, and last two weeks
    const today = new Date();
    const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
    const rangeStart = subWeeksDate(currentWeekStart, 2);
    const rangeEnd = addWeeksDate(currentWeekStart, 1);
    rangeEnd.setHours(23, 59, 59, 999);

    // Check if the clicked day is within our cached range
    const isWithinCachedRange = isWithinInterval(day, {
      start: rangeStart,
      end: rangeEnd
    });

    // Only fetch if outside the cached range
    if (!isWithinCachedRange && user?.user_id) {
      try {
        const res = await fetch(`${import.meta.env.VITE_PUBLIC_API_BASE_URL}/api/meetings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ownerId: user.user_id,
            singleDay: day.toISOString(),
            forceRefresh: true
          })
        });

        if (!res.ok) {
          throw new Error('Failed to fetch meetings');
        }

        const data = await res.json();
        // Merge the new meetings with existing ones, replacing any that overlap
        const existingMeetings = meetings.filter(m => {
          const meetingDate = new Date(m.startTime);
          return !isSameDay(meetingDate, day);
        });
        setMeetings([...existingMeetings, ...data.results]);
      } catch (err) {
        console.error("Failed to fetch meetings for selected day:", err);
      }
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

  return (
    <div
      className="bg-white rounded-lg shadow-sm p-4 mb-4"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
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
