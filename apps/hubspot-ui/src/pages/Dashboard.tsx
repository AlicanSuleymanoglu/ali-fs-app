import React, { useState } from 'react';
import { useUser } from '../hooks/useUser.ts';
import { useTasks } from '../hooks/useTasks.ts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useIsMobile } from '../hooks/use-mobile.tsx';
import { useMeetingContext } from '../context/MeetingContext.tsx';

// Import our newly created components
import WeeklyOverview from '../components/WeeklyOverview.tsx';
import TaskSection from '../components/TaskSection.tsx';
import MeetingSection from '../components/MeetingSection.tsx';
import CreateTaskDialog from '../components/CreateTaskDialog.tsx';
import FloatingActionButton from '../components/FloatingActionButton.tsx';
import { Meeting } from '../components/MeetingCard.tsx';
import UserProfile from '../components/UserProfile.tsx';

const Dashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState<boolean>(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);

  const isMobile = useIsMobile();
  const user = useUser();
  const { tasks, markAsRead, markAsCompleted, disqualifyTask, createTask } = useTasks();
  const { meetings, setMeetings } = useMeetingContext();

  const handleDateSelect = (date: Date) => setCurrentDate(date);
  const handleTaskClick = (taskId: string) => markAsRead(taskId);
  const handleTaskComplete = (taskId: string) => markAsCompleted(taskId);
  const handleTaskDisqualify = (taskId: string, reason: string, otherReason?: string) =>
    disqualifyTask(taskId, reason, otherReason);

  const openCreateTaskDialog = () => {
    setIsCreateTaskDialogOpen(true);
  };

  const handleCreateTask = (taskData: {
    restaurantName: string;
    moreInfo?: string;
    dueDate: string;
  }) => {
    createTask({
      restaurantName: taskData.restaurantName,
      moreInfo: taskData.moreInfo,
      dueDate: taskData.dueDate,
    });

    toast.success(`Task created for ${format(new Date(taskData.dueDate), 'MMMM dd, yyyy')}`);
    setIsCreateTaskDialogOpen(false);
  };

  if (!user || !user.user_id) {
    return <div className="p-6">🔄 Loading dashboard...</div>;
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col relative">
      {/* Moved WeeklyOverview to the very top with no margin */}
      <div className="flex-none">
        <WeeklyOverview
          currentDate={currentDate}
          meetings={meetings}
          tasks={tasks}
          onDateSelect={handleDateSelect}
        />
      </div>

      <TaskSection
        currentDate={currentDate}
        tasks={tasks}
        onTaskClick={handleTaskClick}
        onTaskComplete={handleTaskComplete}
        onTaskDisqualify={handleTaskDisqualify}
      />

      <MeetingSection
        userId={user.user_id}
        selectedDate={currentDate}
        onSelectMeeting={(meeting) => setSelectedMeeting(meeting)}
        onFetchedMeetings={(meetings) => setMeetings(meetings)}
      />

      <FloatingActionButton onCreateTask={openCreateTaskDialog} />

      <CreateTaskDialog
        isOpen={isCreateTaskDialogOpen}
        onOpenChange={setIsCreateTaskDialogOpen}
        onCreateTask={handleCreateTask}
      />
    </div>
  );
};

export default Dashboard;
