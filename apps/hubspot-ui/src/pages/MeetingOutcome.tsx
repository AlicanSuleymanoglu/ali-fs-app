import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, ThumbsUp, ThumbsDown, Clock, Info, Flame } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../components/ui/dialog.tsx";
import { useIsMobile } from "../hooks/use-mobile.tsx";
import { useMeetingContext } from "../context/MeetingContext.tsx";
import DealSelector from './DealSelector.tsx';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover.tsx';
const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

const MeetingOutcome: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
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
  const handleOutcome = async (outcome: 'positive' | 'negative' | 'follow-up') => {
    if (outcome === 'positive') {
      navigate(`/meeting/${id}/positive`, {
        state: {
          dealId: currentDealId,
          companyId: location.state?.companyId,
          remainingDeals,
          dealName,
          completedDeals: location.state?.completedDeals
        }
      });
    } else if (outcome === 'negative') {
      navigate(`/meeting/${id}/negative`, {
        state: {
          dealId: currentDealId,
          companyId: location.state?.companyId,
          remainingDeals,
          dealName,
          completedDeals: location.state?.completedDeals
        }
      });
    } else if (outcome === 'follow-up') {
      // Always set as hot deal before navigating
      if (currentDealId) {
        try {
          await fetch(`${BASE_URL}/api/deals/${currentDealId}/hot-deal`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hot_deal: true }),
          });
        } catch (err) {
          console.error("❌ Failed to set hot deal status:", err);
        }
      }
      navigate(`/meeting/${id}/follow-up`, {
        state: {
          isHotDeal: true,
          dealId: currentDealId,
          companyId: location.state?.companyId,
          remainingDeals,
          dealName,
          completedDeals: location.state?.completedDeals
        }
      });
    }
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

            <div className="relative flex items-center w-full">
              <Button
                className="flex items-center justify-center py-6 bg-blue-500 hover:bg-blue-600 text-white font-bold transition-all duration-200 w-full"
                onClick={() => handleOutcome('follow-up')}
              >
                <Flame size={20} className="mr-2" />
                Hot Deal Follow Up
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="ml-2 p-1 rounded-full bg-white border border-blue-200 text-blue-500 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    aria-label="Hot Deal Info"
                    style={{ position: 'absolute', right: '-44px', top: '50%', transform: 'translateY(-50%)' }}
                  >
                    <Info size={20} />
                  </button>
                </PopoverTrigger>
                <PopoverContent className="max-w-xs text-sm text-blue-900 bg-blue-50 border-blue-200">
                  <strong>Hot Deal Policy:</strong><br />
                  You should only schedule follow-ups with hot deals.<br />
                  If the deal isn't hot, mark it as lost and set a reattempt date.
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MeetingOutcome;
