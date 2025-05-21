import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Check, Home, Calendar } from 'lucide-react';
import { Button } from '../components/ui/button.tsx';
import { refreshMeetings } from '../utils/refreshMeetings.ts';


const MeetingCanceled: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Get meeting details from location.state
  const meetingDetails = location.state?.meetingDetails;

  // Optionally handle missing details
  if (!meetingDetails) {
    return (
      <div className="allo-page">
        <div className="allo-container">
          <div className="w-full max-w-md mx-auto text-center">
            <h2 className="text-2xl font-semibold mb-4">Meeting Canceled</h2>
            <p className="mb-8 text-red-500">Could not load meeting details.</p>
            <Button variant="outline" onClick={() => navigate('/')}>
              <Home size={16} className="mr-2" />
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Handler for scheduling a new meeting with the same company/contact
  const handleScheduleNewMeeting = () => {
    navigate('/add-meeting', {
      state: {
        companyId: meetingDetails.companyId,
        companyName: meetingDetails.companyName,
        companyAddress: meetingDetails.companyAddress,
        contactId: meetingDetails.contactId,
        contactName: meetingDetails.contactName,
        forceCompany: true,
      }
    });
  };

  return (
    <div className="allo-page">
      <div className="allo-container">
        <div className="w-full max-w-md mx-auto text-center">
          <div className="mb-6 flex justify-center">
            <div className="rounded-full bg-green-100 p-4">
              <Check size={32} className="text-green-600" />
            </div>
          </div>
          <h2 className="text-2xl font-semibold mb-4">Meeting Canceled</h2>
          <p className="mb-2">The meeting has been canceled successfully.</p>

          {/* Optionally show info about the canceled meeting */}
          <div className="mb-6 text-sm text-muted-foreground">
            {meetingDetails.companyName && (
              <div><strong>Company:</strong> {meetingDetails.companyName}</div>
            )}
            {meetingDetails.contactName && (
              <div><strong>Contact:</strong> {meetingDetails.contactName}</div>
            )}
            {meetingDetails.companyAddress && (
              <div><strong>Address:</strong> {meetingDetails.companyAddress}</div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4">
            <Button className="allo-button" onClick={() => navigate('/')}>
              <Home size={16} className="mr-2" />
              Go to Homepage
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingCanceled;
