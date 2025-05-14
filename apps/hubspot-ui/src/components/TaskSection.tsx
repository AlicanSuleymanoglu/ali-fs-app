import React, { useState } from 'react';
import { Task } from '../types/index.ts';
import { useNavigate } from 'react-router-dom';
import TaskCard from './TaskCard.tsx';
import { Button } from './ui/button.tsx';
import { ArrowRight, ChevronDown, ChevronUp } from 'lucide-react';
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
          <div className="flex items-center cursor-pointer" onClick={navigateToTasks}>
            <h3 className="text-sm font-medium mb-1 text-muted-foreground">Tasks</h3>
            <ArrowRight className="h-4 w-4 ml-1 text-muted-foreground" />
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
        <div className="flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No tasks for this day. Check all your tasks in the </p>
          <Button variant="link" onClick={navigateToTasks} className="ml-1">
            Inbox ({totalTasksInInbox})
          </Button>
        </div>
      )}
    </div>
  );
};

// Add missing imports
import { isPast, isSameDay } from 'date-fns';

export default TaskSection;
