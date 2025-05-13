
import React from 'react';
import CalendarView from './CalendarView.tsx';
import { Meeting } from './MeetingCard.tsx';

interface MeetingSectionProps {
  userId: string;
  selectedDate: Date;
  onSelectMeeting: (meeting: Meeting) => void;
  onFetchedMeetings: (meetings: Meeting[]) => void;
}

const MeetingSection: React.FC<MeetingSectionProps> = ({
  userId,
  selectedDate,
  onSelectMeeting,
  onFetchedMeetings,
}) => {
  return (
    <div className="flex-grow overflow-hidden">
      <h3 className="text-sm font-medium mb-1 text-muted-foreground">Meetings</h3>
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
