import React, { useState } from 'react';
import { Task } from '../types/index.ts';
import { useNavigate } from 'react-router-dom';
import TaskCard from './TaskCard.tsx';
import { Button } from './ui/button.tsx';
import { ArrowRight, ChevronDown, ChevronUp, Inbox, Mail } from 'lucide-react';
import { useIsMobile } from '../hooks/use-mobile.tsx';

interface TaskSectionProps {
  currentDate: Date;
  tasks: Task[];
  onTaskClick: (taskId: string) => void;
  onTaskComplete: (taskId: string) => void;
  onTaskDisqualify: (taskId: string, reason: string, otherReason?: string) => void;
}

const TaskSection: React.FC<TaskSectionProps> = ({
  currentDate,
  tasks,
  onTaskClick,
  onTaskComplete,
  onTaskDisqualify,
}) => {
  const [showAllTasks, setShowAllTasks] = useState(false);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const navigateToTasks = () => navigate('/inbox');

  // Filter tasks for the selected date
  const tasksForSelectedDate = React.useMemo(() => {
    return tasks.filter((task) => {
      const due = new Date(task.dueDate);

      // Show past + today tasks if today is selected
      if (isSameDay(currentDate, new Date())) {
        return (
          !task.completed &&
          !task.disqualified &&
          (isSameDay(due, currentDate) || isPast(due))
        );
      }

      // For future days, show only tasks due exactly on that day
      return (
        !task.completed &&
        !task.disqualified &&
        isSameDay(due, currentDate)
      );
    });
  }, [currentDate, tasks]);

  const displayedTasks = isMobile && !showAllTasks
    ? tasksForSelectedDate.slice(0, 4)
    : tasksForSelectedDate;

  const hasMoreTasks = isMobile && tasksForSelectedDate.length > 4;

  // Calculate the total number of tasks in the inbox
  const totalTasksInInbox = tasks.filter(task => !task.completed && !task.disqualified).length;

  return (
    <div className="flex-none mb-2">
      {tasksForSelectedDate.length > 0 ? (
        <div>
          <div
            className="flex items-center justify-between p-1 mb-2 bg-gradient-to-r from-orange-25 to-amber-25 border border-[#FF8769]/10 rounded cursor-pointer hover:from-orange-50 hover:to-amber-50 hover:border-[#FF8769]/30 hover:shadow-md transition-all duration-200 shadow-sm group"
            onClick={navigateToTasks}
          >
            <div className="flex items-center gap-1">
              <div className="w-5 h-5 bg-[#FF8769] rounded-full flex items-center justify-center">
                <Inbox className="h-3 w-3 text-white" />
              </div>
              <div>
                <h3 className="text-xs font-medium text-gray-800">Tasks ({totalTasksInInbox})</h3>
              </div>
            </div>
            <ArrowRight className="h-3 w-3 text-[#FF8769] group-hover:translate-x-0.5 transition-transform duration-200" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {displayedTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task.id)}
                onComplete={onTaskComplete}
                onDisqualify={onTaskDisqualify}
              />
            ))}
          </div>
          {hasMoreTasks && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full mt-1 flex items-center justify-center"
              onClick={() => setShowAllTasks(!showAllTasks)}
            >
              {showAllTasks ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Show less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Show all
                </>
              )}
            </Button>
          )}
        </div>
      ) : (
        <div
          className="flex items-center justify-between p-1 mb-2 bg-gradient-to-r from-orange-25 to-amber-25 border border-[#FF8769]/10 rounded cursor-pointer hover:from-orange-50 hover:to-amber-50 hover:border-[#FF8769]/30 hover:shadow-md transition-all duration-200 shadow-sm group"
          onClick={navigateToTasks}
        >
          <div className="flex items-center gap-1">
            <div className="w-5 h-5 bg-[#FF8769] rounded-full flex items-center justify-center">
              <Inbox className="h-3 w-3 text-white" />
            </div>
            <div>
              <h3 className="text-xs font-medium text-gray-800">Tasks ({totalTasksInInbox})</h3>
            </div>
          </div>
          <ArrowRight className="h-3 w-3 text-[#FF8769] group-hover:translate-x-0.5 transition-transform duration-200" />
        </div>
      )}
    </div>
  );
};

// Add missing imports
import { isPast, isSameDay } from 'date-fns';

export default TaskSection;


