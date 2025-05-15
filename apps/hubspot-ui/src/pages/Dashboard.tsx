import React, { useState, useEffect } from 'react';
import { useUser } from '../hooks/useUser.ts';
import { useTasks } from '../hooks/useTasks.ts';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useIsMobile } from '../hooks/use-mobile.tsx';
import { useMeetingContext } from '../context/MeetingContext.tsx';
import { useLocation } from 'react-router-dom';
import { MapPin } from 'lucide-react';

// Import our newly created components
import WeeklyOverview from '../components/WeeklyOverview.tsx';
import TaskSection from '../components/TaskSection.tsx';
import MeetingSection from '../components/MeetingSection.tsx';
import CreateTaskDialog from '../components/CreateTaskDialog.tsx';
import FloatingActionButton from '../components/FloatingActionButton.tsx';
import { Meeting } from '../components/MeetingCard.tsx';
import UserProfile from '../components/UserProfile.tsx';
import { Button } from '../components/ui/button.tsx';

const Dashboard: React.FC = () => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isCreateTaskDialogOpen, setIsCreateTaskDialogOpen] = useState<boolean>(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const location = useLocation();

  // Use the date from navigation state if available
  useEffect(() => {
    if (location.state?.selectedDate) {
      setCurrentDate(new Date(location.state.selectedDate));
    }
  }, [location.state]);

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

  // Function to generate Google Maps route URL with waypoints
  const generateMapsRouteURL = () => {
    // Get meetings for the selected day
    const dayMeetings = meetings.filter(meeting => {
      const meetingDate = new Date(meeting.startTime);
      return (
        meetingDate.getDate() === currentDate.getDate() &&
        meetingDate.getMonth() === currentDate.getMonth() &&
        meetingDate.getFullYear() === currentDate.getFullYear()
      );
    });

    // Sort meetings by start time (earliest first)
    const sortedMeetings = [...dayMeetings].sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });

    if (sortedMeetings.length === 0) {
      return null; // No meetings today
    }

    // Helper function to get full location (address and city)
    const getFullLocation = (meeting: Meeting) => {
      if (!meeting.address) return '';

      // The address field should already contain the full address including city
      // If the address doesn't contain a comma (which typically separates address from city),
      // we should assume it's only a partial address
      if (!meeting.address.includes(',')) {
        // Try to append company information if possible, as company often has city info
        return meeting.address + (meeting.companyName ? `, ${meeting.companyName}` : '');
      }

      // If the address already has a comma, assume it's a complete address
      return meeting.address;
    };

    if (sortedMeetings.length === 1) {
      // For a single meeting, just show its location
      const meeting = sortedMeetings[0];
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(getFullLocation(meeting))}`;
    }

    // Get the first and last meeting locations
    const firstMeeting = sortedMeetings[0];
    const lastMeeting = sortedMeetings[sortedMeetings.length - 1];

    // Create waypoints from the meetings in between
    const waypoints = sortedMeetings.slice(1, -1).map(meeting => getFullLocation(meeting));

    let url = `https://www.google.com/maps/dir/?api=1`;

    // Add origin (first meeting)
    url += `&origin=${encodeURIComponent(getFullLocation(firstMeeting))}`;

    // Add destination (last meeting)
    url += `&destination=${encodeURIComponent(getFullLocation(lastMeeting))}`;

    // Add waypoints (stops in between)
    if (waypoints.length > 0) {
      url += `&waypoints=${waypoints.map(wp => encodeURIComponent(wp)).join('|')}`;
    }

    return url;
  };

  const handleOpenMapsRoute = () => {
    const url = generateMapsRouteURL();
    if (url) {
      // Open the URL in a new tab
      const win = window as any;
      if (win) {
        win.open(url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error('Failed to open Google Maps. Please try again.');
      }
    }
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

  // Get meetings for the current day to determine if route button should be disabled
  const dayMeetings = meetings.filter(meeting => {
    const meetingDate = new Date(meeting.startTime);
    return (
      meetingDate.getDate() === currentDate.getDate() &&
      meetingDate.getMonth() === currentDate.getMonth() &&
      meetingDate.getFullYear() === currentDate.getFullYear()
    );
  });
  const hasMeetings = dayMeetings.length > 0;

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

      {/* Route Planning Button moved to the MeetingSection header */}
      <MeetingSection
        userId={user.user_id}
        selectedDate={currentDate}
        onSelectMeeting={(meeting) => setSelectedMeeting(meeting)}
        onFetchedMeetings={(meetings) => setMeetings(meetings)}
        actionButton={
          <Button
            onClick={handleOpenMapsRoute}
            variant="outline"
            size="sm"
            className={`flex items-center gap-1 h-6 px-2 rounded-full transition-colors ${hasMeetings
              ? "text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-400 hover:bg-blue-50"
              : "text-gray-400 border-gray-200 cursor-not-allowed"
              }`}
            title={hasMeetings ? "View route map for today's meetings" : "No meetings scheduled for this day"}
            disabled={!hasMeetings}
          >
            <MapPin size={14} className={hasMeetings ? "text-blue-600" : "text-gray-400"} />
            <span className="text-xs font-medium">Route</span>
          </Button>
        }
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
