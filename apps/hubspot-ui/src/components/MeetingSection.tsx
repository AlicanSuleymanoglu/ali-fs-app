import React, { ReactNode } from 'react';
import CalendarView from './CalendarView.tsx';
import { Meeting } from './MeetingCard.tsx';

interface MeetingSectionProps {
  userId: string;
  selectedDate: Date;
  onSelectMeeting: (meeting: Meeting) => void;
  onFetchedMeetings: (meetings: Meeting[]) => void;
  actionButton?: ReactNode;
}

const MeetingSection: React.FC<MeetingSectionProps> = ({
  userId,
  selectedDate,
  onSelectMeeting,
  onFetchedMeetings,
  actionButton,
}) => {
  return (
    <div className="flex-grow overflow-hidden">
      <div className="flex justify-between items-center mb-1">
        <h3 className="text-sm font-medium text-muted-foreground">Meetings</h3>
        {actionButton}
      </div>
      <div className="h-full overflow-hidden">
        <CalendarView
          userId={userId}
          selectedDate={selectedDate}
          onSelectMeeting={onSelectMeeting}
          onFetchedMeetings={onFetchedMeetings}
        />
      </div>
    </div>
  );
};

export default MeetingSection;
