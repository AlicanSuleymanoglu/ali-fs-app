
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, User, Building2, CheckCircle, XCircle, ClockIcon, RotateCw, AlertTriangle, MapPin } from 'lucide-react';
import { HoverCard, HoverCardTrigger, HoverCardContent } from "../components/ui/hover-card.tsx";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover.tsx";
import { cn } from "../lib/utils.ts";
import { useIsMobile } from "../hooks/use-mobile.tsx";

export interface Meeting {
  id: string;
  title: string;
  contactName: string;
  companyName: string;
  startTime: string;
  endTime: string;
  date: string;
  type?: 'sales meeting' | 'sales followup';
  status?: 'scheduled' | 'completed' | 'canceled' | 'rescheduled';
  address?: string;
  dealId?: string | number | null;
  onSelect?: (meeting: Meeting) => void;
}

interface MeetingCardProps {
  meeting: Meeting;
  isCalendarView?: boolean;
  startHour?: number;
  endHour?: number;
  onSelect?: (meeting: Meeting) => void;
  onCancel?: (meeting: Meeting) => void;
}

const MeetingCard: React.FC<MeetingCardProps> = ({
  meeting,
  isCalendarView = false,
  startHour,
  endHour,
  onCancel,
  onSelect
}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const isCompleted = meeting.status === 'completed';
  const isPastScheduled = meeting.status === 'scheduled' && new Date(meeting.startTime) < new Date();

  const getDayOfWeek = (dateString: string) => {
    const [day, month, year] = dateString.split('.').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const dayOfWeek = getDayOfWeek(meeting.date);
  const handleClick = () => {
    if (meeting.status === 'completed') return;
    navigate(`/meeting/${meeting.id}`); // ✅ Navigate to the meeting page
  };


  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    if (onCancel) {
      onCancel(meeting);
    }
  };
  const handleAddressClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the card click
    if (meeting.address) {
      const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meeting.address)}`;
      window.open(googleMapsUrl, '_blank');
    }
  };

  const renderStatusBadge = () => {
    const status = meeting.status || 'scheduled';
    let icon, bgColor, textColor;

    switch (status) {
      case 'completed':
        icon = <CheckCircle size={isCalendarView ? 12 : 14} />;
        bgColor = 'bg-green-100';
        textColor = 'text-green-800';
        break;
      case 'canceled':
        icon = <XCircle size={isCalendarView ? 12 : 14} />;
        bgColor = 'bg-red-100';
        textColor = 'text-red-800';
        break;
      case 'rescheduled':
        icon = <RotateCw size={isCalendarView ? 12 : 14} />;
        bgColor = 'bg-orange-100';
        textColor = 'text-orange-800';
        break;
      default: // scheduled
        if (isPastScheduled) {
          bgColor = 'bg-yellow-100';
          textColor = 'text-yellow-800';

          return (
            <div className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${bgColor} ${textColor} whitespace-nowrap`}>
              {isMobile ? (
                <Popover>
                  <PopoverTrigger>
                    <AlertTriangle size={isCalendarView ? 12 : 14} className="text-[#FF6B00] mr-1" />
                  </PopoverTrigger>
                  <PopoverContent className="w-72 p-3">
                    <p className="text-sm">This meeting is scheduled but has already passed. Please update the meeting outcome.</p>
                  </PopoverContent>
                </Popover>
              ) : (
                <HoverCard>
                  <HoverCardTrigger>
                    <AlertTriangle size={isCalendarView ? 12 : 14} className="text-[#FF6B00] mr-1" />
                  </HoverCardTrigger>
                  <HoverCardContent className="w-72 p-3">
                    <p className="text-sm">This meeting is scheduled but has already passed. Please update the meeting outcome.</p>
                  </HoverCardContent>
                </HoverCard>
              )}
              <span>Scheduled</span>
            </div>
          );
        } else {
          icon = <ClockIcon size={isCalendarView ? 12 : 14} />;
          bgColor = 'bg-blue-100';
          textColor = 'text-blue-800';
        }
    }

    return (
      <div className={`flex items-center gap-1 text-xs rounded-full px-2 py-0.5 ${bgColor} ${textColor} whitespace-nowrap`}>
        {icon}
        <span>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
      </div>
    );
  };

  if (isCalendarView && startHour !== undefined && endHour !== undefined) {
    const startDate = new Date(meeting.startTime);
    const endDate = new Date(meeting.endTime);

    const startMinutes = startDate.getHours() * 60 + startDate.getMinutes();
    const endMinutes = endDate.getHours() * 60 + endDate.getMinutes();

    const totalMinutes = (endHour - startHour) * 60;
    const startPercentage = ((startMinutes - startHour * 60) / totalMinutes) * 100;
    const durationPercentage = ((endMinutes - startMinutes) / totalMinutes) * 100;

    const cardCursor = isCompleted ? 'cursor-default' : 'cursor-pointer';
    
    // Bestimme die Hintergrundfarbe basierend auf dem Status
    let meetingBgColor = 'bg-[#FF8769]/90';
    let meetingHoverBgColor = 'hover:bg-[#FF8769]/100';
    
    if (meeting.status === 'completed') {
      meetingBgColor = 'bg-green-200';
      meetingHoverBgColor = 'hover:bg-green-300';
    } else if (meeting.status === 'canceled') {
      meetingBgColor = 'bg-red-200';
      meetingHoverBgColor = 'hover:bg-red-300';
    } else if (meeting.status === 'rescheduled') {
      meetingBgColor = 'bg-yellow-200';
      meetingHoverBgColor = 'hover:bg-yellow-300';
    }

    // Berechne die minimale Höhe basierend auf der Dauer (aber mindestens 50px für Lesbarkeit)
    const calculatedHeight = `${durationPercentage}%`;
    const minHeight = '50px';

    return (
      <div
        className={`meeting-card ${meetingBgColor} ${meetingHoverBgColor} transition-all duration-200 ${cardCursor} shadow-sm border border-opacity-10`}
        style={{
          top: `${startPercentage}%`,
          height: calculatedHeight,
          minHeight: minHeight,
          maxHeight: `${durationPercentage > 100 ? 100 : durationPercentage}%`,
          zIndex: 10
        }}
        onClick={handleClick}
      >
        <div className="p-2 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-start mb-1">
            <div className="text-xs font-bold truncate max-w-[75%]">{meeting.title}</div>
            <div>
              {renderStatusBadge()}
            </div>
          </div>
          <div className="mt-auto text-xs flex flex-wrap gap-2">
            <div className="flex items-center gap-1 truncate">
              <Building2 size={10} />
              <span className="truncate max-w-[80px]">{meeting.companyName}</span>
            </div>
            <div className="flex items-center gap-1 truncate">
              <User size={10} />
              <span className="truncate max-w-[80px]">{meeting.contactName}</span>
            </div>
          </div>
          <div className="text-xs opacity-75 mt-1">
            {new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - 
            {new Date(meeting.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "allo-card hover-lift",
        isCompleted ? "cursor-default" : "cursor-pointer"
      )}
      onClick={handleClick}
    >
      <div className="flex flex-col space-y-2">
        <div className="flex justify-between items-start">
          <h3 className="font-medium">{meeting.title}</h3>
          {renderStatusBadge()}
        </div>
        {isPastScheduled && (
          <div className="bg-yellow-100 text-yellow-800 text-xs p-2 rounded">
            <div className="flex items-center gap-1">
              <AlertTriangle size={14} className="text-[#FF6B00]" />
              <span>This meeting is in the past and needs attention</span>
            </div>
          </div>
        )}
        <div className="flex justify-between text-sm text-allo-muted">
          <div className="flex items-center gap-1.5">
            <User size={14} />
            <span>{meeting.contactName}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Building2 size={14} />
            <span>{meeting.companyName}</span>
          </div>
        </div>
        {meeting.address && (
          <div
            className="flex items-center gap-1.5 text-xs text-allo-muted hover:text-[#FF8769] cursor-pointer"
            onClick={handleAddressClick}
          >
            <MapPin size={14} />
            <span className="underline">{meeting.address}</span>
          </div>
        )}
        <div className="flex justify-between text-xs text-allo-muted mt-2 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <Calendar size={14} />
            <div className="flex flex-col items-center">
              <span className="text-xs">{meeting.date}</span>
              <span className="text-[10px]">{dayOfWeek}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock size={14} />
            <span>{new Date(meeting.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingCard;
