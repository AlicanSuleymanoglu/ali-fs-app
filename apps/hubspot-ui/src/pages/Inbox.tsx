
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TaskCard from '../components/TaskCard.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { useTasks } from '../hooks/useTasks.ts';
import { Button } from "../components/ui/button.tsx";
import { ArrowLeft, Calendar } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../components/ui/input.tsx";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.tsx";
import { Calendar as CalendarComponent } from "../components/ui/calendar.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select.tsx";
import { format, isSameDay, isToday, isTomorrow, isYesterday, addDays, subDays } from 'date-fns';

const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, markAsRead, markAsCompleted, disqualifyTask } = useTasks();
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'followup' | 'cancellation'>('all');
  const [search, setSearch] = useState("");
  const [dueDateFilter, setDueDateFilter] = useState<'all' | 'today' | 'tomorrow' | 'overdue' | 'this-week' | 'custom'>('all');
  const [customDate, setCustomDate] = useState<Date | undefined>(undefined);
  const [calendarOpen, setCalendarOpen] = useState(false);

  // Sort tasks by due date (earliest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Deduplicate tasks by companyId and dueDate (same day)
  const incompleteTasks = [];
  const seen = new Map();
  for (const task of sortedTasks) {
    if (task.completed || task.disqualified) continue;
    const subject = task.subject?.toLowerCase() || '';
    const isFollowup = subject.includes('followup task');
    const isCancellation = subject.includes('cancellation task');
    if (taskTypeFilter === 'followup' && !isFollowup) continue;
    if (taskTypeFilter === 'cancellation' && !isCancellation) continue;
    if (taskTypeFilter === 'all' && !(isFollowup || isCancellation)) continue;
    const companyId = task.companyId || 'unknown';
    const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : 'unknown'; // YYYY-MM-DD
    const key = `${companyId}_${dueDate}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      incompleteTasks.push(task);
    }
  }

  // Filter by due date
  const dateFilteredTasks = incompleteTasks.filter(task => {
    if (dueDateFilter === 'all') return true;

    const taskDueDate = new Date(task.dueDate);
    const today = new Date();

    switch (dueDateFilter) {
      case 'today':
        return isToday(taskDueDate);
      case 'tomorrow':
        return isTomorrow(taskDueDate);
      case 'overdue':
        return taskDueDate < today && !isToday(taskDueDate);
      case 'this-week':
        const weekStart = subDays(today, today.getDay());
        const weekEnd = addDays(weekStart, 6);
        return taskDueDate >= weekStart && taskDueDate <= weekEnd;
      case 'custom':
        return customDate ? isSameDay(taskDueDate, customDate) : true;
      default:
        return true;
    }
  });

  // Filter by restaurant name search
  const filteredTasks = search.trim().length > 0
    ? dateFilteredTasks.filter(task =>
      (task.restaurantName || '').toLowerCase().includes(search.trim().toLowerCase())
    )
    : dateFilteredTasks;

  const handleTaskClick = (taskId: string) => {
    markAsRead(taskId);
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      await markAsCompleted(taskId);
      toast.success("Task marked as completed");
    } catch (err) {
      console.error("❌ Error completing task:", err);
      toast.error("Failed to mark task as completed");
    }
  };

  const handleTaskDisqualify = (taskId: string, reason: string, otherReason?: string) => {
    disqualifyTask(taskId, reason, otherReason);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="mr-2"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-xl font-semibold">My Inbox</h2>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by restaurant name..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Type:</span>
          <Select value={taskTypeFilter} onValueChange={(value) => setTaskTypeFilter(value as any)}>
            <SelectTrigger className="max-w-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tasks</SelectItem>
              <SelectItem value="followup">Followup</SelectItem>
              <SelectItem value="cancellation">Cancellation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Due:</span>
          <Select value={dueDateFilter} onValueChange={(value) => {
            if (value === 'custom') {
              setCalendarOpen(true);
            } else {
              setDueDateFilter(value as any);
              setCustomDate(undefined);
            }
          }}>
            <SelectTrigger className="max-w-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="this-week">This Week</SelectItem>
              <SelectItem value="custom">Custom Date</SelectItem>
            </SelectContent>
          </Select>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="single"
                selected={customDate}
                onSelect={(selectedDate) => {
                  if (selectedDate) {
                    setCustomDate(selectedDate);
                    setDueDateFilter('custom');
                    setCalendarOpen(false);
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="mt-4">
        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task.id)}
                onComplete={handleTaskComplete}
                onDisqualify={handleTaskDisqualify}
              />
            ))
          ) : (
            <p className="text-center py-10 text-muted-foreground">
              No tasks at the moment. Great job keeping your inbox clean!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
