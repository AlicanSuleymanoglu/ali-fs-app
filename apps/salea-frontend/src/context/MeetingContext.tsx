// MeetingContext.tsx
import React, { createContext, useContext, useState } from 'react';
import { Meeting } from '../components/MeetingCard.tsx';

interface MeetingContextType {
  meetings: Meeting[];
  setMeetings: (meetings: Meeting[]) => void;
}

const MeetingContext = createContext<MeetingContextType | undefined>(undefined);

export const useMeetingContext = () => {
  const context = useContext(MeetingContext);
  if (!context) throw new Error('useMeetingContext must be used within a MeetingProvider');
  return context;
};

export const MeetingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  return (
    <MeetingContext.Provider value={{ meetings, setMeetings }}>
      {children}
    </MeetingContext.Provider>
  );
};
