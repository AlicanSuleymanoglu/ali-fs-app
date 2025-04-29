import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Check,
  X,
  Clock,
  AlertTriangle,
  MapPin
} from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { useIsMobile } from "../hooks/use-mobile.tsx";
import { useMeetingContext } from '../context/MeetingContext.tsx'; // ✅ import the context
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog.tsx';
import { data } from '@remix-run/router';

const MeetingActions: React.FC = () => {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const { meetings } = useMeetingContext(); // ✅ use context
  const [meetingDetails, setMeetingDetails] = useState<any | null>(null);

  useEffect(() => {
    const foundMeeting = meetings.find(m => m.id === id);
    setMeetingDetails(foundMeeting || null);
  }, [id, meetings]);

  if (!meetingDetails) {
    return <div className="p-6">❌ Meeting not found in context.</div>;
  }

  const handleAddressClick = () => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingDetails.address)}`;
    window.open(googleMapsUrl, '_blank');
  };

  const handleCancelConfirm = async () => {
    setCancelDialogOpen(false);
    try {
      const res = await fetch(`http://localhost:3000/api/meeting/${meetingDetails.id}/cancel`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!res.ok) throw new Error('Failed to cancel meeting');
      navigate('/meeting-canceled', {
        state: {
          meetingDetails: {
            companyId: meetingDetails.companyId,
            companyName: meetingDetails.companyName,
            companyAddress: meetingDetails.address,
            contactId: meetingDetails.contactId,
            contactName: meetingDetails.contactName,
            dealId: meetingDetails.dealId
          }
        }
      });
    } catch (err) {
      alert('Failed to cancel meeting. Please try again.');
    }
  };

  const handleComplete = () => {
    navigate(`/meeting/${id}/outcome`, {
      state: {
        dealId: meetingDetails.dealId, // <-- Pass the dealId!
      }
    });
  };
  console.log("Meeting details:", meetingDetails);
  console.log("Deal ID from context:", meetingDetails?.dealId);

  const handleReschedule = () => {
    navigate('/add-meeting', {
      state: {
        isRescheduling: true,
        meetingId: id,
        title: meetingDetails.title,
        companyName: meetingDetails.companyName,
        companyId: meetingDetails.companyId,
        companyAddress: meetingDetails.address,
        contactId: meetingDetails.contactId,
        contactName: meetingDetails.contactName,
        meetingType: meetingDetails.type,
        forceCompany: true,
        dealId: meetingDetails.dealId
      }
    });
  };

  return (
    <div className="allo-page">
      <div className="allo-container">
        <Button
          variant="outline"
          className="self-start mb-6"
          onClick={() => navigate('/dashboard')}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Meetings
        </Button>

        <div className="allo-card w-full max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-2">{meetingDetails.title}</h2>

          <div className="py-2">
            <p className="text-sm text-gray-500">Contact</p>
            <p className="font-medium">{meetingDetails.contactName}</p>
          </div>

          <div className="py-2">
            <p className="text-sm text-gray-500">Company</p>
            <p className="font-medium">{meetingDetails.companyName}</p>
          </div>

          <div className="py-2">
            <p className="text-sm text-gray-500">Address</p>
            <button
              className="font-medium flex items-center text-allo-primary hover:underline"
              onClick={handleAddressClick}
            >
              <MapPin className="h-4 w-4 mr-1" />
              {meetingDetails.address}
            </button>
          </div>

          <div className="py-2">
            <p className="text-sm text-gray-500">Date &amp; Time</p>
            <p className="font-medium">
              {meetingDetails.date} • {new Date(meetingDetails.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              {' - '}
              {new Date(meetingDetails.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="py-2">
            <p className="text-sm text-gray-500">Status</p>
            <p className="font-medium capitalize">{meetingDetails.status}</p>
          </div>

          <div className={`mt-6 ${isMobile ? 'flex flex-col space-y-3' : 'grid grid-cols-3 gap-3'}`}>
            <Button
              className="flex items-center justify-center py-2 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setCancelDialogOpen(true)}
            >
              <X size={16} className="mr-1" />
              Cancel
            </Button>

            <Button
              className="flex items-center justify-center py-2 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleReschedule}
            >
              <Clock size={16} className="mr-1" />
              Reschedule
            </Button>

            <Button
              className="flex items-center justify-center py-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={handleComplete}
            >
              <Check size={16} className="mr-1" />
              Complete
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-[350px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="text-red-500 mr-2 h-5 w-5" />
              Cancel Meeting
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this meeting with {meetingDetails.contactName} from {meetingDetails.companyName}?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, keep it</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelConfirm} className="bg-red-600 hover:bg-red-700">
              Yes, cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeetingActions;