import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog.tsx";
import { useIsMobile } from "../hooks/use-mobile.tsx";
import { useMeetingContext } from "../context/MeetingContext.tsx";
const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";


const MeetingOutcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [showHotDealDialog, setShowHotDealDialog] = useState(false);
  const isMobile = useIsMobile();

  // Get the meeting details and dealId from context
  const { meetings } = useMeetingContext();
  const meetingDetails = meetings.find(m => m.id === id);
  const dealId = meetingDetails?.dealId;

  // Handler for outcome selection
  const handleOutcome = (outcome: 'positive' | 'negative' | 'follow-up') => {
    if (outcome === 'positive') {
      navigate(`/meeting/${id}/positive`, { state: { dealId } });
    } else if (outcome === 'negative') {
      navigate(`/meeting/${id}/negative`, { state: { dealId } });
    } else if (outcome === 'follow-up') {
      setShowHotDealDialog(true);
    }
  };

  // Handler for hot deal dialog
  const handleHotDealResponse = async (isHotDeal: boolean) => {
    setShowHotDealDialog(false);

    if (dealId) {
      try {
        await fetch(`${BASE_URL}/api/deals/${dealId}/hot-deal`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hot_deal: isHotDeal }),
        });

        console.log(`✅ Deal ${dealId} set as ${isHotDeal ? 'true' : 'false'}`);
      } catch (err) {
        console.error("❌ Failed to set hot deal status:", err);
      }
    } else {
      console.error("❌ No deal ID found.");
    }

    // Continue with navigation to follow-up
    navigate(`/meeting/${id}/follow-up`, {
      state: { isHotDeal, dealId }
    });
  };


  return (
    <div className="allo-page">
      <div className="allo-container">
        <Button
          variant="outline"
          className="self-start mb-6"
          onClick={() => navigate(`/meeting/${id}`)}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back
        </Button>

        <div className="w-full max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-8 text-center">Meeting Outcome</h2>

          <div className="grid grid-cols-1 gap-4">
            <Button
              className="flex items-center justify-center py-6 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleOutcome('positive')}
            >
              <ThumbsUp size={18} className="mr-2" />
              Positive
            </Button>

            <Button
              className="flex items-center justify-center py-6 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleOutcome('negative')}
            >
              <ThumbsDown size={18} className="mr-2" />
              Negative
            </Button>

            <Button
              className="flex items-center justify-center py-6 bg-blue-500 hover:bg-blue-600 text-white"
              onClick={() => handleOutcome('follow-up')}
            >
              <Clock size={18} className="mr-2" />
              Follow-up
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={showHotDealDialog} onOpenChange={setShowHotDealDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Is this a hot deal?</DialogTitle>
          </DialogHeader>

          <DialogFooter className="mt-6 flex space-x-2 justify-center sm:justify-between">
            <Button
              variant="outline"
              onClick={() => handleHotDealResponse(false)}
              className="flex-1"
            >
              No
            </Button>
            <Button
              variant="default"
              onClick={() => handleHotDealResponse(true)}
              className="flex-1 bg-[#2E1813] hover:bg-[#2E1813]/90"
            >
              Yes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingOutcome;
