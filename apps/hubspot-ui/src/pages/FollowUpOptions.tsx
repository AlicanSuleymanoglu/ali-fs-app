import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Clock, Calendar as CalendarIcon, Check } from 'lucide-react';
import { Button } from "../components/ui/button.tsx";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "../components/ui/popover.tsx";
import { Calendar } from "../components/ui/calendar.tsx";
import { format } from "date-fns";
import { useMeetingContext } from '../context/MeetingContext.tsx';
import { useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser.ts';
import { Textarea } from "../components/ui/textarea.tsx";

const FollowUpOptions: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const isHotDeal = location.state?.isHotDeal || false;
    const dealId = location.state?.dealId || null;
    const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

    const { meetings } = useMeetingContext();
    const meetingDetails = meetings.find(m => m.id === id);
    const user = useUser();
    const [showTaskOptions, setShowTaskOptions] = useState(false);
    const [date, setDate] = useState<Date | undefined>(undefined);
    const [showDateSelector, setShowDateSelector] = useState(false);
    const [showTaskSuccess, setShowTaskSuccess] = useState(false);
    const [createdTaskDate, setCreatedTaskDate] = useState<Date | null>(null);
    const [taskNote, setTaskNote] = useState("");
    const [submittingNote, setSubmittingNote] = useState(false);
    const [step, setStep] = useState<'choose' | 'task'>((isHotDeal) ? 'choose' : 'task');

    if (!meetingDetails) {
        toast.error("Meeting not found");
        navigate('/dashboard');
        return null;
    }

    const targetDealId = location.state?.dealId || meetingDetails.dealId;

    // Use location.state.companyId if present, else fallback to meetingDetails.companyId
    const companyIdToUse = location.state?.companyId || meetingDetails.companyId;

    const checkCompanyName = () => {
        if (!meetingDetails.companyName || meetingDetails.companyName.toLowerCase() === 'unknown') {
            toast.error("Unknown Company", {
                description: "Please refresh the dashboard to update meeting data",
                duration: 4000,
            });
            navigate('/dashboard');
            return false;
        }
        return true;
    };

    const handleScheduleFollowUp = async () => {
        if (!checkCompanyName()) return;

        // Update deal stage to 'in-negotiation'
        try {
            await fetch(`${BASE_URL}/api/deal/${targetDealId}/in-negotiation`, {
                method: 'PATCH',
                credentials: 'include',
            });
        } catch (err) {
            console.error("Failed to update deal stage to 'in-negotiation':", err);
        }

        // Prefer company info from location.state (DealSelector) if present
        const companyIdToUse = location.state?.companyId || meetingDetails.companyId;
        const companyNameToUse = location.state?.companyName || meetingDetails.companyName;
        const companyAddressToUse = location.state?.companyAddress || meetingDetails.address;

        // Pass all relevant state to AddMeeting
        navigate('/add-meeting', {
            state: {
                ...location.state,
                isFollowUp: true,
                originalMeetingId: meetingDetails.id,
                meetingId: id,
                companyId: companyIdToUse,
                companyName: companyNameToUse,
                companyAddress: companyAddressToUse,
                contactId: meetingDetails.contactId,
                contactName: meetingDetails.contactName,
                dealId: dealId || meetingDetails.dealId,
                forceCompany: true,
                meetingType: meetingDetails.type,
                isHotDeal: isHotDeal,
            }
        });
    };

    const calculateBusinessDays = (startDate: Date, days: number): Date => {
        let currentDate = new Date(startDate);
        let addedDays = 0;

        while (addedDays < days) {
            currentDate.setDate(currentDate.getDate() + 1);
            if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
                addedDays++;
            }
        }

        return currentDate;
    };

    const handleTaskDateSelect = (timeframe: string) => {
        if (!checkCompanyName()) return;
        const today = new Date();
        let taskDate = new Date(today);
        const daysMap: { [key: string]: number } = {
            '3days': 3,
            '1week': 7,
            '2weeks': 14,
            '3weeks': 21
        };
        if (timeframe === 'custom') {
            setShowDateSelector(true);
            return;
        }
        const daysToAdd = daysMap[timeframe] || 7;
        if (timeframe === '3days') {
            taskDate = calculateBusinessDays(today, daysToAdd);
        } else {
            taskDate.setDate(today.getDate() + daysToAdd);
        }
        setDate(taskDate);
    };

    const scheduleTask = async (taskDate: Date, noteOverride?: string) => {
        if (!meetingDetails || !user?.user_id) return;

        const dateWithTime = new Date(taskDate);
        dateWithTime.setHours(9, 0, 0, 0);

        const unixMillis = dateWithTime.getTime();

        const payload = {
            taskDate: unixMillis,
            companyId: companyIdToUse,
            contactId: meetingDetails.contactId,
            dealId: targetDealId,
            companyName: meetingDetails.companyName,
            ownerId: user.user_id,
            meetingId: meetingDetails.id,
            taskBody: noteOverride?.trim() || undefined,
        };

        try {
            const res = await fetch(`${BASE_URL}/api/hubspot/tasks/create`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to create task");

            await fetch(`${BASE_URL}/api/deal/${targetDealId}/in-negotiation`, {
                method: 'PATCH',
                credentials: 'include',
            });

            const completedRes = await fetch(`${BASE_URL}/api/meeting/${meetingDetails.id}/mark-completed`, {
                method: "POST",
                credentials: "include"
            });

            if (!completedRes.ok) throw new Error("Failed to mark meeting as completed");

            setShowTaskSuccess(true);
            setCreatedTaskDate(taskDate);
            toast.success(`Follow-up task scheduled for ${format(taskDate, 'dd.MM.yyyy')}`, {
                description: "The task has been created and added to your calendar",
                duration: 4000,
            });

            setTimeout(() => {
                setShowTaskSuccess(false);
                setCreatedTaskDate(null);
                setShowTaskOptions(false);
                setShowDateSelector(false);
                if (location.state?.completedDeals && location.state?.dealId) {
                    const updatedCompletedDeals = {
                        ...location.state.completedDeals,
                        [location.state.dealId]: 'followup'
                    };
                    // Save to sessionStorage
                    const sessionCompleted = JSON.parse(sessionStorage.getItem('completedDeals') || '{}');
                    sessionStorage.setItem('completedDeals', JSON.stringify({ ...sessionCompleted, ...updatedCompletedDeals }));
                    // Go back to DealSelector
                    navigate(`/meeting/${id}/outcome`, {
                        state: {
                            completedDeals: updatedCompletedDeals,
                            meetingId: id
                        }
                    });
                } else {
                    navigate('/dashboard');
                }
            }, 3000);

        } catch (err) {
            console.error("Failed to schedule task:", err);
            toast.error("Failed to schedule follow-up task");
        }
    };

    const handleCalendarSelect = (selectedDate: Date | undefined) => {
        if (selectedDate) {
            setDate(selectedDate);
            setShowDateSelector(false);
        }
    };

    const handleScheduleTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!date) return;
        setSubmittingNote(true);
        await scheduleTask(date, taskNote);
        setSubmittingNote(false);
    };

    const handleBackNavigation = () => {
        if (showTaskOptions || step === 'task') {
            setShowTaskOptions(false);
            setShowDateSelector(false);
            if (isHotDeal) {
                setStep('choose');
            }
        } else {
            navigate(`/meeting/${id}/follow-up`);
        }
    };

    const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTaskNote(e.currentTarget.value);
    };

    return (
        <div className="allo-page">
            <div className="allo-container">
                <Button
                    variant="outline"
                    className="self-start mb-6"
                    onClick={handleBackNavigation}
                >
                    <ChevronLeft size={16} className="mr-1" />
                    Back
                </Button>
                <div className="w-full max-w-md mx-auto">
                    <h2 className="text-xl font-semibold mb-8 text-center">Schedule Follow-Up Task</h2>
                    {step === 'choose' ? (
                        <div className="allo-card flex flex-col gap-6 items-center">
                            <h3 className="text-lg font-medium mb-4 text-center">What would you like to do?</h3>
                            <Button
                                className="w-full"
                                onClick={handleScheduleFollowUp}
                            >
                                Schedule Follow-Up Meeting
                            </Button>
                            <Button
                                className="w-full"
                                variant="outline"
                                onClick={() => setStep('task')}
                            >
                                Schedule Follow-Up Task
                            </Button>
                        </div>
                    ) : showTaskSuccess ? (
                        <div className="allo-card bg-green-50 border-green-200">
                            <div className="flex flex-col items-center justify-center py-8 space-y-4">
                                <div className="bg-green-100 p-3 rounded-full">
                                    <Check className="h-8 w-8 text-green-600" />
                                </div>
                                <div className="text-center">
                                    <h3 className="text-lg font-medium text-green-800">Task Created Successfully</h3>
                                    <p className="text-green-600 mt-1">
                                        Follow-up task scheduled for {createdTaskDate && format(createdTaskDate, 'dd.MM.yyyy')}
                                    </p>
                                    <p className="text-sm text-green-500 mt-2">
                                        Redirecting to dashboard...
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <form className="flex flex-col gap-6" onSubmit={handleScheduleTask}>
                            <div className="allo-card">
                                <h3 className="text-lg font-medium mb-4">When to follow up?</h3>
                                {showDateSelector ? (
                                    <div className="mb-4">
                                        <Popover open={showDateSelector} onOpenChange={setShowDateSelector}>
                                            <PopoverTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start text-left font-normal"
                                                >
                                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                                    {date ? format(date, "dd.MM.yyyy") : "Select a date"}
                                                </Button>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="center">
                                                <Calendar
                                                    mode="single"
                                                    selected={date}
                                                    onSelect={handleCalendarSelect}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        <Button type="button" variant={date && format(date, 'dd.MM.yyyy') === format(calculateBusinessDays(new Date(), 3), 'dd.MM.yyyy') ? 'default' : 'outline'} onClick={() => handleTaskDateSelect('3days')}>In 3 days</Button>
                                        <Button type="button" variant={date && format(date, 'dd.MM.yyyy') === format(new Date(new Date().setDate(new Date().getDate() + 7)), 'dd.MM.yyyy') ? 'default' : 'outline'} onClick={() => handleTaskDateSelect('1week')}>In 1 week</Button>
                                        <Button type="button" variant={date && format(date, 'dd.MM.yyyy') === format(new Date(new Date().setDate(new Date().getDate() + 14)), 'dd.MM.yyyy') ? 'default' : 'outline'} onClick={() => handleTaskDateSelect('2weeks')}>In 2 weeks</Button>
                                        <Button type="button" variant={date && format(date, 'dd.MM.yyyy') === format(new Date(new Date().setDate(new Date().getDate() + 21)), 'dd.MM.yyyy') ? 'default' : 'outline'} onClick={() => handleTaskDateSelect('3weeks')}>In 3 weeks</Button>
                                        <Button
                                            type="button"
                                            className="bg-gray-100 text-gray-800 hover:bg-gray-200"
                                            onClick={() => handleTaskDateSelect('custom')}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            Select a date
                                        </Button>
                                    </div>
                                )}
                            </div>
                            <div className="allo-card">
                                <h3 className="text-lg font-medium mb-2">Task Notes (optional)</h3>
                                <Textarea
                                    value={taskNote}
                                    onChange={handleTextareaChange}
                                    placeholder="Add any notes for this follow-up task..."
                                    className="text-base min-h-[100px]"
                                    maxLength={500}
                                />
                            </div>
                            <Button
                                type="submit"
                                className="w-full"
                                disabled={!date || submittingNote}
                            >
                                {submittingNote ? "Scheduling..." : date ? `Schedule Task for ${format(date, 'dd.MM.yyyy')}` : "Schedule Task"}
                            </Button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowUpOptions; 