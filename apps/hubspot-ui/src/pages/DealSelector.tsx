import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChevronLeft, Check } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { cn } from "../lib/utils.ts";


interface Deal {
    id: string;
    name: string;
    dealstage?: string;
    contractUploaded?: boolean;
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
    // Map of dealId -> { name, id }
    const [dealToCompany, setDealToCompany] = useState<Record<string, { name: string, id: string | null }>>({});
    const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";


    // Fetch company names for all deals on mount
    useEffect(() => {
        const fetchCompanies = async () => {
            if (!deals.length) return;
            try {
                const res = await fetch(`${BASE_URL}/api/deals/companies`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ dealIds: deals.map(d => d.id) }),
                });
                const data = await res.json();
                // data.dealToCompanyInfo is a map of dealId -> { companyId, companyName }
                // If backend only returns dealToCompanyName, fallback to old behavior
                let dealToCompany: Record<string, { name: string, id: string | null }> = {};
                if (data.dealToCompanyInfo) {
                    for (const dealId of Object.keys(data.dealToCompanyInfo)) {
                        dealToCompany[dealId] = {
                            name: data.dealToCompanyInfo[dealId].companyName || 'Unknown Company',
                            id: data.dealToCompanyInfo[dealId].companyId || null
                        };
                    }
                } else if (data.dealToCompanyName) {
                    for (const deal of deals) {
                        dealToCompany[deal.id] = { name: data.dealToCompanyName[deal.id] || 'Unknown Company', id: null };
                    }
                }
                setDealToCompany(dealToCompany);
            } catch (err) {
                setDealToCompany({});
            }
        };
        fetchCompanies();
    }, [deals]);

    // Update completed deals when returning from outcome flow or on mount
    useEffect(() => {
        // Read from sessionStorage
        const sessionCompleted = JSON.parse(sessionStorage.getItem('completedDeals') || '{}');
        let merged = { ...sessionCompleted };
        // Merge with navigation state if present
        if (location.state?.completedDeals) {
            merged = { ...merged, ...location.state.completedDeals };
        }
        if (location.state?.completedDealId && location.state?.completedDealStatus) {
            merged[location.state.completedDealId] = location.state.completedDealStatus;
        }
        setCompletedDeals(merged);
    }, [location.state]);

    const handleDealSelect = (deal: Deal) => {
        // Find the companyId for this deal
        const companyId = dealToCompany[deal.id]?.id || null;
        navigate(`/meeting/${meetingId}/outcome`, {
            state: {
                dealId: deal.id,
                companyId: companyId,
                dealName: deal.name,
                dealStage: deal.dealstage,
                contractUploaded: deal.contractUploaded,
                completedDeals,
            }
        });
    };

    const completedDealIds = deals.filter(
        d => completedDeals[d.id] || d.contractUploaded || d.dealstage === 'closedwon' || d.dealstage === 'closedlost'
    ).map(d => d.id);
    const allDealsCompleted = completedDealIds.length === deals.length;

    const statusLabel = (status: DealStatus) => {
        if (status === 'closed-won') return 'Closed Won';
        if (status === 'closed-lost') return 'Closed Lost';
        if (status === 'followup') return 'Follow-up';
        return 'Completed';
    };

    const getDealStageLabel = (deal: Deal) => {
        // If contractUploaded is true, always show as Closed Won, even if dealstage is closedlost
        if (deal.contractUploaded) {
            return { label: 'Closed Won', color: 'text-green-600 bg-green-50' };
        }
        switch (deal.dealstage) {
            case 'closedwon':
                return { label: 'Closed Won', color: 'text-green-600 bg-green-50' };
            case 'closedlost':
                return { label: 'Closed Lost', color: 'text-red-600 bg-red-50' };
            case 'qualifiedtobuy':
                return { label: 'Follow-Up', color: 'text-yellow-600 bg-yellow-50' };
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
                            const dealStage = getDealStageLabel(deal);
                            const isDone = deal.contractUploaded || deal.dealstage === 'closedwon' || deal.dealstage === 'closedlost';
                            const doneBg = '';
                            const isSessionCompleted = !!status;
                            return (
                                <Button
                                    key={deal.id}
                                    onClick={() => handleDealSelect(deal)}
                                    className={cn(
                                        "flex items-center justify-between py-4 px-3 text-left h-auto w-full text-base sm:text-lg transition-colors",
                                        "flex-wrap gap-y-2 sm:gap-y-0",
                                        isSessionCompleted ? "bg-green-50 border-green-200 ring-2 ring-green-200" : isDone ? doneBg : "bg-white hover:bg-gray-50 border"
                                    )}
                                    variant="outline"
                                >
                                    <div className="flex flex-col min-w-0 max-w-full">
                                        <span className={cn(
                                            "font-medium break-words truncate max-w-full",
                                            isDone && !isSessionCompleted ? "text-gray-400" : ""
                                        )}>{deal.name || 'Unnamed Deal'}</span>
                                        <span className="text-xs text-gray-500 block">
                                            {dealToCompany[deal.id]?.name || 'Loading company...'}
                                        </span>
                                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                                            <span className={cn(
                                                "text-xs px-2 py-0.5 rounded-full truncate",
                                                dealStage.color,
                                                isDone && !isSessionCompleted ? "opacity-60" : ""
                                            )}>
                                                {dealStage.label}
                                            </span>
                                            {isSessionCompleted && (
                                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-green-200 text-green-800 text-xs font-semibold">
                                                    <Check size={16} className="mr-1" /> Completed
                                                </span>
                                            )}
                                        </div>
                                    </div>
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