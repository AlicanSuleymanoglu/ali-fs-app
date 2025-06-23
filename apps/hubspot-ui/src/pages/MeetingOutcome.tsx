import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ThumbsUp, ThumbsDown, Clock } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog.tsx";
import { useIsMobile } from "../hooks/use-mobile.tsx";
import { useMeetingContext } from "../context/MeetingContext.tsx";
import DealSelector from './DealSelector.tsx';
const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

const MeetingOutcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [showHotDealDialog, setShowHotDealDialog] = useState(false);
  const isMobile = useIsMobile();
  const [completedDeals, setCompletedDeals] = useState<Set<string>>(new Set());

  // Get the meeting details and deals from context
  const { meetings } = useMeetingContext();
  const meetingDetails = meetings.find(m => m.id === id);

  // Get the current deal from location state if we're processing multiple deals
  const currentDealId = location.state?.dealId;
  const remainingDeals = location.state?.remainingDeals;
  const dealName = location.state?.dealName;
  const dealStage = location.state?.dealStage;

  // If we have multiple deals and no current deal selected, show the deal selector
  if (meetingDetails?.deals && meetingDetails.deals.length > 1 && !currentDealId) {
    return (
      <DealSelector
        meetingId={id!}
        deals={meetingDetails.deals}
        onBack={() => navigate(`/meeting/${id}`)}
      />
    );
  }

  // Handler for outcome selection
  const handleOutcome = (outcome: 'positive' | 'negative' | 'follow-up') => {
    if (outcome === 'positive') {
      navigate(`/meeting/${id}/positive`, {
        state: {
          dealId: currentDealId,
          remainingDeals,
          dealName
        }
      });
    } else if (outcome === 'negative') {
      navigate(`/meeting/${id}/negative`, {
        state: {
          dealId: currentDealId,
          remainingDeals,
          dealName
        }
      });
    } else if (outcome === 'follow-up') {
      setShowHotDealDialog(true);
    }
  };

  // Handler for hot deal dialog
  const handleHotDealResponse = async (isHotDeal: boolean) => {
    setShowHotDealDialog(false);

    if (currentDealId) {
      try {
        await fetch(`${BASE_URL}/api/deals/${currentDealId}/hot-deal`, {
          method: 'PATCH',
          credentials: 'include',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hot_deal: isHotDeal }),
        });

        console.log(`✅ Deal ${currentDealId} set as ${isHotDeal ? 'true' : 'false'}`);
      } catch (err) {
        console.error("❌ Failed to set hot deal status:", err);
      }
    }

    // Continue with navigation to follow-up
    navigate(`/meeting/${id}/follow-up`, {
      state: {
        isHotDeal,
        dealId: currentDealId,
        remainingDeals,
        dealName
      }
    });
  };

  const handleBack = () => {
    if (currentDealId) {
      // If in multi-deal flow, go back to deal selector
      navigate(`/meeting/${id}/outcome`, {
        state: {
          completedDeals: location.state?.completedDeals || []
        }
      });
      return;
    }
    // Otherwise, go back to meeting details
    navigate(`/meeting/${id}`);
  };

  return (
    <div className="allo-page">
      <div className="allo-container">
        <Button
          variant="outline"
          className="self-start mb-6"
          onClick={handleBack}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back
        </Button>

        <div className="w-full max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-4 text-center">Meeting Outcome</h2>
          {dealName && (
            <p className="text-sm text-gray-500 mb-8 text-center">
              Updating deal: {dealName}
              {remainingDeals > 0 && (
                <span className="block mt-1">
                  ({remainingDeals} more {remainingDeals === 1 ? 'deal' : 'deals'} to update)
                </span>
              )}
            </p>
          )}

          <div className="grid grid-cols-1 gap-4">
            <Button
              className="flex items-center justify-center py-6 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => handleOutcome('positive')}
            >
              <ThumbsUp size={18} className="mr-2" />
              Closed Won
            </Button>

            <Button
              className="flex items-center justify-center py-6 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => handleOutcome('negative')}
            >
              <ThumbsDown size={18} className="mr-2" />
              Closed Lost
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
