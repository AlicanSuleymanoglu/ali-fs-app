import React, { useMemo, useState, useRef } from 'react';
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
  isToday,
  addWeeks,
  subWeeks
} from 'date-fns';
import { cn } from '@/lib/utils';
import { useMeetingContext } from '../context/MeetingContext';
import { Task } from '@/types';
import { Meeting } from '@/components/MeetingCard';
import UserProfile from './UserProfile';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
  const { meetings: contextMeetings } = useMeetingContext(); // 👈 Get meetings from context
  const [weekOffset, setWeekOffset] = useState(0);
  const touchStartX = useRef<number | null>(null);

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
    return meetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return isSameDay(meetingDate, date);
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

  const MAX_DOTS = 4;
  const MAX_DOTS_TOTAL = 8;

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
            const dayTasks = getTasksForDay(day);
            const isSelected = isSameDay(day, currentDate);

            const totalItems = dayMeetings.length + dayTasks.length;
            const showPlus = totalItems > MAX_DOTS_TOTAL;
            const dotSize = totalItems > MAX_DOTS ? "w-1.5 h-1.5" : "w-2 h-2";

            let meetingDotsToShow = Math.min(dayMeetings.length, showPlus ? MAX_DOTS_TOTAL / 2 : MAX_DOTS);
            let taskDotsToShow = Math.min(dayTasks.length, showPlus ? (MAX_DOTS_TOTAL - meetingDotsToShow) : (MAX_DOTS - meetingDotsToShow));

            if (meetingDotsToShow < (showPlus ? MAX_DOTS_TOTAL / 2 : MAX_DOTS) && !showPlus) {
              taskDotsToShow = Math.min(dayTasks.length, MAX_DOTS_TOTAL - meetingDotsToShow);
            }
            if (taskDotsToShow < (showPlus ? MAX_DOTS_TOTAL / 2 : MAX_DOTS) && !showPlus) {
              meetingDotsToShow = Math.min(dayMeetings.length, MAX_DOTS_TOTAL - taskDotsToShow);
            }

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

                <div className="flex gap-0.5 mt-1 items-center justify-center h-2">
                  {Array.from({ length: meetingDotsToShow }).map((_, i) => (
                    <div
                      key={`meeting-${i}`}
                      className={`${dotSize} rounded-full bg-[#FF8769]`}
                      title={`${dayMeetings.length} meetings`}
                    />
                  ))}

                  {Array.from({ length: taskDotsToShow }).map((_, i) => (
                    <div
                      key={`task-${i}`}
                      className={`${dotSize} rounded-full bg-[#2E1813]`}
                      title={`${dayTasks.length} tasks`}
                    />
                  ))}

                  {showPlus && (
                    <div className={`${dotSize} flex items-center justify-center ml-0.5 font-bold text-[8px] text-gray-600`} title={`${totalItems} total items`}>
                      +
                    </div>
                  )}
                </div>
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
