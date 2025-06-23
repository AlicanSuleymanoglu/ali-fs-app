import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { cn } from "../lib/utils.ts";

interface Deal {
    id: string;
    name: string;
    dealstage?: string;
}

type DealStatus = 'closed-won' | 'closed-lost' | 'followup';

interface DealSelectorProps {
    meetingId: string;
    deals: Deal[];
    onBack: () => void;
}

const DealSelector: React.FC<DealSelectorProps> = ({ meetingId, deals, onBack }) => {
    const navigate = useNavigate();
    const location = useLocation();
    // Map of dealId -> status
    const [completedDeals, setCompletedDeals] = useState<Record<string, DealStatus>>({});

    // Update completed deals when returning from outcome flow
    useEffect(() => {
        if (location.state?.completedDealId && location.state?.completedDealStatus) {
            setCompletedDeals(prev => ({
                ...prev,
                [location.state.completedDealId]: location.state.completedDealStatus
            }));
        }
    }, [location.state]);

    const handleDealSelect = (deal: Deal) => {
        navigate(`/meeting/${meetingId}/outcome`, {
            state: {
                dealId: deal.id,
                dealName: deal.name,
                dealStage: deal.dealstage,
                completedDeals,
            }
        });
    };

    const completedDealIds = deals.filter(
        d => completedDeals[d.id] || d.dealstage === 'closedwon' || d.dealstage === 'closedlost'
    ).map(d => d.id);
    const allDealsCompleted = completedDealIds.length === deals.length;

    const statusLabel = (status: DealStatus) => {
        if (status === 'closed-won') return 'Closed Won';
        if (status === 'closed-lost') return 'Closed Lost';
        if (status === 'followup') return 'Follow-up';
        return 'Completed';
    };

    const getDealStageLabel = (stage?: string) => {
        switch (stage) {
            case 'closedwon':
                return { label: 'Closed Won', color: 'text-green-600 bg-green-50' };
            case 'closedlost':
                return { label: 'Closed Lost', color: 'text-red-600 bg-red-50' };
            case 'appointmentscheduled':
                return { label: 'Meeting Scheduled', color: 'text-blue-600 bg-blue-50' };
            case 'presentationscheduled':
                return { label: 'Exploration', color: 'text-purple-600 bg-purple-50' };
            default:
                return { label: 'Meeting Scheduled', color: 'text-blue-600 bg-blue-50' };
        }
    };

    return (
        <div className="allo-page px-2 sm:px-0">
            <div className="allo-container w-full max-w-md mx-auto p-2 sm:p-6">
                <Button
                    variant="outline"
                    className="self-start mb-6"
                    onClick={onBack}
                >
                    <ChevronLeft size={16} className="mr-1" />
                    Back
                </Button>

                <div className="w-full">
                    <h2 className="text-xl sm:text-2xl font-semibold mb-4 text-center">Select Deal to Update</h2>
                    <p className="text-sm sm:text-base text-gray-500 mb-8 text-center">
                        {completedDealIds.length} of {deals.length} deals completed
                        {allDealsCompleted && (
                            <span className="block mt-2 text-green-600 font-medium">
                                ✨ All deals have been updated
                            </span>
                        )}
                    </p>

                    <div className="grid grid-cols-1 gap-3">
                        {deals.map((deal) => {
                            const status = completedDeals[deal.id];
                            const dealStage = getDealStageLabel(deal.dealstage);
                            const isDone = deal.dealstage === 'closedwon' || deal.dealstage === 'closedlost';
                            const doneBg = '';
                            return (
                                <Button
                                    key={deal.id}
                                    onClick={() => handleDealSelect(deal)}
                                    disabled={!!status}
                                    className={cn(
                                        "flex items-center justify-between py-4 px-3 text-left h-auto w-full text-base sm:text-lg transition-colors",
                                        "flex-wrap gap-y-2 sm:gap-y-0",
                                        status ? "bg-gray-50 border-gray-200" : isDone ? doneBg : "bg-white hover:bg-gray-50 border"
                                    )}
                                    variant="outline"
                                >
                                    <div className="flex flex-col min-w-0 max-w-full">
                                        <span className={cn(
                                            "font-medium break-words truncate max-w-full",
                                            isDone && !status ? "text-gray-400" : ""
                                        )}>{deal.name || 'Unnamed Deal'}</span>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className="text-xs sm:text-sm text-gray-500 font-mono truncate">#{deal.id}</span>
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full truncate",
                                                dealStage.color,
                                                isDone && !status ? "opacity-60" : ""
                                            )}>
                                                {dealStage.label}
                                            </span>
                                        </div>
                                    </div>
                                    {status && (
                                        <div className="flex items-center text-green-600 flex-shrink-0">
                                            <Check size={22} className="mr-1 sm:mr-2" />
                                            <span className="text-xs sm:text-sm">{statusLabel(status)}</span>
                                        </div>
                                    )}
                                </Button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DealSelector; 