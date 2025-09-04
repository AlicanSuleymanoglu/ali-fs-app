import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ChevronLeft,
  Check,
  X,
  Clock,
  AlertTriangle,
  // MapPin, // MapPin is not used in the provided code snippet for MeetingActions
  ExternalLink,
  RefreshCw
} from 'lucide-react';
import { Button, buttonVariants } from '../components/ui/button.tsx'; // Added buttonVariants
import { useIsMobile } from "../hooks/use-mobile.tsx";
import { useMeetingContext } from '../context/MeetingContext.tsx';
import { useUser } from '../hooks/useUser.ts';
import { refreshMeetings } from '../utils/refreshMeetings.ts';
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
import { cn, cleanHtmlTags } from '../lib/utils.ts'; // Added cn
import { toast } from '../components/ui/use-toast.ts';
import { Popover, PopoverTrigger, PopoverContent } from '../components/ui/popover.tsx';
import { Input } from '../components/ui/input.tsx';
import CreateTaskDialog from '../components/CreateTaskDialog.tsx';

// Add type for meeting
interface Meeting {
  id: string;
  companyId?: string;
  dealId?: string;
  contactId?: string;
  companies?: Array<{ id: string; name: string; }>;
  deals?: Array<{ id: string; name: string; }>;
  companyCount?: number;
  dealCount?: number;
  title?: string;
  companyName?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  internalNotes?: string;
  startTime?: string;
  type?: string;
  dealstage?: string;
  contractUploaded?: boolean;
}

const MeetingActions: React.FC = () => {

  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [validationDialogOpen, setValidationDialogOpen] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const { meetings, setMeetings } = useMeetingContext();
  const [meetingDetails, setMeetingDetails] = useState<any | null>(null);
  const user = useUser();
  const ownerId = user?.user_id;
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDealClosedDialog, setShowDealClosedDialog] = useState(false);
  const [dealClosedUrl, setDealClosedUrl] = useState<string | null>(null);
  const [dealClosedStage, setDealClosedStage] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelError, setCancelError] = useState("");
  const [refreshCooldown, setRefreshCooldown] = useState(false);
  const cooldownTimeout = useRef<number | null>(null);
  const [showCancelTaskPrompt, setShowCancelTaskPrompt] = useState(false);
  const [showCancelTaskDialog, setShowCancelTaskDialog] = useState(false);
  const [cancelTaskPrefill, setCancelTaskPrefill] = useState<{ restaurantName: string; companyId: string; contactId: string; dealId: string; companyName: string; } | null>(null);

  useEffect(() => {
    const foundMeeting = meetings.find(m => m.id === id);
    if (foundMeeting) {
      const filledMeeting = {
        ...foundMeeting,
        address: foundMeeting.address || foundMeeting.companyAddress || 'Address not available'
      };
      setMeetingDetails(filledMeeting);
    } else {
      setMeetingDetails(null);
    }
  }, [id, meetings]);

  if (!meetingDetails) {
    return <div className="p-6">❌ Meeting not found in context.</div>;
  }

  const handleBackToDashboard = () => {
    // Navigate back to dashboard with the meeting date as state to preserve the selected date
    const meetingDate = meetingDetails.startTime ? new Date(meetingDetails.startTime) : null;
    navigate('/dashboard', {
      state: {
        selectedDate: meetingDate
      }
    });
  };

  const handleAddressClick = () => {
    const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(meetingDetails.address)}`;
    (window as any).open(googleMapsUrl, '_blank');
  };

  const handleCancelConfirm = async () => {
    if (!cancellationReason.trim()) {
      setCancelError("Cancellation reason is required");
      return;
    }
    setCancelError("");
    setCancelSubmitting(true);
    try {
      const res = await fetch(`${BASE_URL}/api/meeting/${meetingDetails.id}/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancellation_reason: cancellationReason })
      });
      if (!res.ok) throw new Error('Failed to cancel meeting');
      if (user?.user_id) {
        await refreshMeetings(user.user_id, setMeetings);
      }
      // Prompt for cancellation follow-up task
      setCancelTaskPrefill({
        restaurantName: meetingDetails.companyName || '',
        companyId: meetingDetails.companyId || '',
        contactId: meetingDetails.contactId || '',
        dealId: meetingDetails.dealId || '',
        companyName: meetingDetails.companyName || '',
      });
      setShowCancelTaskPrompt(true);
      // Don't navigate yet; wait for user to answer prompt
    } catch (err) {
      setCancelError("Failed to cancel meeting. Please try again.");
    } finally {
      setCancelSubmitting(false);
      setCancelDialogOpen(false);
      setCancellationReason("");
    }
  };

  const handleComplete = () => {
    const missing = [];
    if (!meetingDetails.companyId) missing.push('Company');
    if (!meetingDetails.dealId && (!meetingDetails.deals || meetingDetails.deals.length === 0)) missing.push('Deal');
    if (!meetingDetails.contactId) missing.push('Contact');

    if (missing.length > 0) {
      setMissingFields(missing);
      setValidationDialogOpen(true);
      return;
    }

    // If multiple deals, go to deal selector
    if (meetingDetails.deals && meetingDetails.deals.length > 1) {
      navigate(`/meeting/${id}/outcome`);
      return;
    }

    // If only one deal, check if it's closedwon/closedlost
    let singleDeal = null;
    if (meetingDetails.deals && meetingDetails.deals.length === 1) {
      singleDeal = meetingDetails.deals[0];
    } else if (meetingDetails.dealId) {
      singleDeal = { id: meetingDetails.dealId, dealstage: meetingDetails.dealstage };
    }
    // If we have dealstage info and it's closedwon/closedlost, show disclaimer
    if (singleDeal && (singleDeal.dealstage === 'closedwon' || singleDeal.dealstage === 'closedlost')) {
      setDealClosedUrl(`https://app.hubspot.com/contacts/48291892/deal/${singleDeal.id}`);
      setDealClosedStage(singleDeal.dealstage === 'closedwon' ? 'Closed Won' : 'Closed Lost');
      setShowDealClosedDialog(true);
      return;
    }

    // If all required fields are present, proceed with navigation for single deal
    navigate(`/meeting/${id}/outcome`, {
      state: {
        dealId: meetingDetails.dealId,
        dealName: meetingDetails.deals && meetingDetails.deals.length === 1 ? meetingDetails.deals[0].name : undefined,
      }
    });
  };

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
        contactPhone: meetingDetails.contactPhone,
        contactName: meetingDetails.contactName,
        meetingType: meetingDetails.type,
        forceCompany: true,
        dealId: meetingDetails.dealId,
        internalNotes: meetingDetails.internalNotes,
        companies: meetingDetails.companies,
        deals: meetingDetails.deals,
        companyCount: meetingDetails.companyCount,
        dealCount: meetingDetails.dealCount,
      }
    });
  };

  const handleRefresh = async () => {
    if (!user?.user_id) {
      toast({
        title: "Error",
        description: "User not found",
        variant: "destructive"
      });
      return;
    }
    if (refreshCooldown) return;
    setRefreshCooldown(true);
    if (cooldownTimeout.current) window.clearTimeout(cooldownTimeout.current);
    cooldownTimeout.current = window.setTimeout(() => setRefreshCooldown(false), 10000);
    setIsRefreshing(true);
    try {
      // Get the refreshed meetings data
      const refreshedMeetings = await refreshMeetings(user.user_id, setMeetings);

      // Find the updated meeting from the refreshed data
      const updatedMeeting = refreshedMeetings?.find((m: Meeting) => m.id === id);

      if (updatedMeeting) {
        // Update the meeting details immediately
        setMeetingDetails(updatedMeeting);

        // Check if all required fields are now present
        const stillMissing = [];
        if (!updatedMeeting.companyId) stillMissing.push('Company');
        if (!updatedMeeting.dealId) stillMissing.push('Deal');
        if (!updatedMeeting.contactId) stillMissing.push('Contact');

        if (stillMissing.length === 0) {
          // All required fields are now present
          toast({
            title: "Success",
            description: "All required information found! Proceeding to outcome page.",
            variant: "default"
          });
          // Close the dialog first
          setValidationDialogOpen(false);
          // Small delay to ensure dialog is closed before navigation
          setTimeout(() => {
            navigate(`/meeting/${id}/outcome`, {
              state: {
                dealId: updatedMeeting.dealId,
              }
            });
          }, 100);
        } else {
          // Some fields are still missing
          setMissingFields(stillMissing);
          toast({
            title: "Information Still Missing",
            description: `Still missing: ${stillMissing.join(', ')}. Please update in HubSpot.`,
            variant: "destructive"
          });
        }
      } else {
        toast({
          title: "Error",
          description: "Meeting not found after refresh. Please try again.",
          variant: "destructive"
        });
      }
    } catch (err) {
      console.error('Failed to refresh meetings:', err);
      toast({
        title: "Error",
        description: "Failed to refresh meetings. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="allo-page">
      <div className="allo-container">
        <Button
          variant="outline"
          className="self-start mb-6"
          onClick={handleBackToDashboard}
        >
          <ChevronLeft size={16} className="mr-1" />
          Back to Meetings
        </Button>

        <div className="allo-card w-full max-w-md mx-auto">
          <h2 className="text-xl font-semibold mb-2">{meetingDetails.title}</h2>
          <div className="py-2">
            <p className="text-sm text-gray-500">Restaurant</p>
            {meetingDetails.companies && meetingDetails.companies.length > 1 ? (
              <Popover>
                <PopoverTrigger className="font-medium text-allo-primary hover:underline cursor-pointer">
                  Multiple Restaurants ({meetingDetails.companyCount})
                </PopoverTrigger>
                <PopoverContent className="w-64 p-2">
                  <div className="space-y-2">
                    {meetingDetails.companies?.map((company: { id: string; name: string }) => (
                      <a
                        key={company.id}
                        href={`https://app.hubspot.com/contacts/48291892/company/${company.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block p-2 hover:bg-gray-100 rounded-md"
                      >
                        {company.name}
                      </a>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <p className="font-medium">
                {meetingDetails.companyName}
              </p>
            )}
          </div>

          {/* Removed MapPin from here as it was not imported if address is not meant to be a map link */}
          <div className="py-2 flex flex-col items-center">
            <p className="text-sm text-gray-500 text-center">Address</p>
            <button
              className="font-medium flex items-center justify-center text-allo-primary hover:underline mt-1"
              onClick={handleAddressClick}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", textAlign: "center" }}
            >
              <span>{meetingDetails.address}</span>
            </button>
          </div>

          <div className="py-2">
            <p className="text-sm text-gray-500">Contact</p>
            <p className="font-medium">{meetingDetails.contactName}</p>
          </div>

          <div className="py-2">
            <p className="text-sm text-gray-500">Phone Number</p>
            <p className="font-medium">{meetingDetails.contactPhone}</p>
          </div>

          {/* Deal ID Section */}
          <div className={`py-2 ${isMobile ? 'text-center' : ''}`}>
            <p className={`text-sm text-gray-500 ${isMobile ? 'text-center' : ''}`}>Deal ID</p>
            <p className={`text-xs text-gray-400 italic ${isMobile ? 'text-center' : ''} mb-1 whitespace-nowrap`}>
              Click to add contract notes
            </p>
            <div className="flex items-center gap-2 justify-center">
              {meetingDetails.deals && meetingDetails.deals.length > 1 ? (
                <Popover>
                  <PopoverTrigger className="font-medium text-allo-primary hover:underline cursor-pointer">
                    Multiple Deals ({meetingDetails.dealCount})
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-2">
                    <div className="space-y-2">
                      {meetingDetails.deals?.map((deal: { id: string; name: string }) => (
                        <a
                          key={deal.id}
                          href={`https://app.hubspot.com/contacts/48291892/deal/${deal.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 hover:bg-gray-100 rounded-md font-mono"
                        >
                          #{deal.id}
                        </a>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : (
                meetingDetails.dealId ? (
                  <a
                    href={`https://app.hubspot.com/contacts/48291892/deal/${meetingDetails.dealId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`font-medium font-mono text-allo-primary hover:text-allo-primary/80 flex items-center gap-1 group ${isMobile ? 'justify-center' : ''}`}
                  >
                    <span>#{meetingDetails.dealId}</span>
                    <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                ) : (
                  <p className={`font-medium text-gray-400 ${isMobile ? 'text-center' : ''}`}>No deal associated</p>
                )
              )}
            </div>
          </div>

          {/* 🔥 Internal Notes Section */}
          <div className="py-2">
            <p className="text-sm text-gray-500">Internal Notes</p>
            {meetingDetails.internalNotes ? (
              <p className="font-medium">{cleanHtmlTags(meetingDetails.internalNotes)}</p>
            ) : (
              <p className="font-medium text-gray-400">No internal notes available</p>
            )}
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

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent className="max-w-[350px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="text-destructive mr-2 h-5 w-5" />
              Cancel Meeting
            </AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for canceling this meeting with {meetingDetails.contactName} from {meetingDetails.companyName}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <form onSubmit={e => { e.preventDefault(); handleCancelConfirm(); }} className="flex flex-col gap-3 mt-2">
            <Input
              value={cancellationReason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCancellationReason(e.currentTarget.value)}
              placeholder="Enter cancellation reason..."
              required
              maxLength={200}
              className="text-base"
              autoFocus
            />
            {cancelError && <div className="text-red-500 text-sm">{cancelError}</div>}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={cancelSubmitting}>No, keep it</AlertDialogCancel>
              <Button type="submit" className="bg-destructive hover:bg-destructive/90 w-full" disabled={cancelSubmitting}>
                {cancelSubmitting ? "Canceling..." : "Cancel Meeting"}
              </Button>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
      {/* Prompt for cancellation follow-up task */}
      <AlertDialog open={showCancelTaskPrompt} onOpenChange={setShowCancelTaskPrompt}>
        <AlertDialogContent className="max-w-[350px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <Clock className="text-green-600 mr-2 h-5 w-5" />
              Add Cancellation Follow-Up Task?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Would you like to create a follow-up task to check in with {cancelTaskPrefill?.restaurantName} at a later date?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowCancelTaskPrompt(false);
              navigate('/meeting-canceled', {
                state: {
                  meetingDetails: {
                    companyId: meetingDetails.companyId,
                    companyName: meetingDetails.companyName,
                    companyAddress: meetingDetails.address,
                    contactId: meetingDetails.contactId,
                    contactName: meetingDetails.contactName,
                    dealId: meetingDetails.dealId,
                  }
                }
              });
            }}>No, just cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => {
              setShowCancelTaskPrompt(false);
              const missing = [] as string[];
              if (!meetingDetails.companyId) missing.push('Company');
              if (!meetingDetails.dealId && (!meetingDetails.deals || meetingDetails.deals.length === 0)) missing.push('Deal');
              if (!meetingDetails.contactId) missing.push('Contact');

              if (missing.length > 0) {
                setMissingFields(missing);
                setValidationDialogOpen(true);
                return;
              }

              setShowCancelTaskDialog(true);
            }} className="bg-green-600 hover:bg-green-700 text-white">Yes, add follow-up task</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* Cancellation Task Dialog */}
      <CreateTaskDialog
        isOpen={showCancelTaskDialog}
        onOpenChange={(open) => {
          setShowCancelTaskDialog(open);
          if (!open) {
            navigate('/meeting-canceled', {
              state: {
                meetingDetails: {
                  companyId: meetingDetails.companyId,
                  companyName: meetingDetails.companyName,
                  companyAddress: meetingDetails.address,
                  contactId: meetingDetails.contactId,
                  contactName: meetingDetails.contactName,
                  dealId: meetingDetails.dealId,
                }
              }
            });
          }
        }}
        onCreateTask={async ({ restaurantName, moreInfo, dueDate }) => {
          if (!cancelTaskPrefill || !user?.user_id) return;
          // Compose payload for cancellation task
          const dateObj = new Date(dueDate);
          dateObj.setHours(9, 0, 0, 0);
          const unixMillis = dateObj.getTime();
          const payload = {
            taskDate: unixMillis,
            companyId: cancelTaskPrefill.companyId,
            contactId: cancelTaskPrefill.contactId,
            dealId: cancelTaskPrefill.dealId,
            companyName: cancelTaskPrefill.companyName,
            ownerId: user.user_id,
            meetingId: id,
            taskBody: moreInfo?.trim() || undefined,
            subjectOverride: `Cancellation Task - ${restaurantName}`,
          };
          try {
            const res = await fetch(`${BASE_URL}/api/hubspot/tasks/create`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...payload, hs_task_subject: `Cancellation Task - ${restaurantName}` })
            });
            if (!res.ok) throw new Error('Failed to create cancellation task');
            toast({
              title: 'Cancellation Task Created',
              description: `A follow-up task for ${restaurantName} was created.`,
              variant: 'default',
            });
            setShowCancelTaskDialog(false);
            navigate('/meeting-canceled', {
              state: {
                meetingDetails: {
                  companyId: meetingDetails.companyId,
                  companyName: meetingDetails.companyName,
                  companyAddress: meetingDetails.address,
                  contactId: meetingDetails.contactId,
                  contactName: meetingDetails.contactName,
                  dealId: meetingDetails.dealId,
                }
              }
            });
          } catch (err) {
            toast({
              title: 'Failed to Create Task',
              description: 'Could not create cancellation follow-up task.',
              variant: 'destructive',
            });
          }
        }}
        // Prefill restaurant name
        {...(cancelTaskPrefill ? { defaultRestaurantName: cancelTaskPrefill.restaurantName } : {})}
      />

      {/* Validation Dialog - Prettier version */}
      <AlertDialog open={validationDialogOpen} onOpenChange={setValidationDialogOpen}>
        <AlertDialogContent className="max-w-md bg-card text-card-foreground p-6 rounded-lg shadow-xl">
          <AlertDialogHeader className="mb-4">
            <AlertDialogTitle className="flex items-center text-lg font-semibold text-destructive">
              <AlertTriangle className="mr-3 h-6 w-6 flex-shrink-0" />
              Missing Information
            </AlertDialogTitle>
            <AlertDialogDescription className="mt-2 text-sm text-muted-foreground">
              The following required information is missing: <span className="font-semibold text-destructive">{missingFields.join(', ')}</span>.
              <br />
              Please talk to your SDR or update this information in HubSpot to proceed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex flex-col space-y-3 pt-4">
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button
                onClick={handleRefresh}
                disabled={isRefreshing || refreshCooldown}
                className={cn(
                  buttonVariants({ size: 'default' }),
                  "w-full bg-green-600 text-primary-foreground hover:bg-green-700 focus-visible:ring-green-500",
                  (isRefreshing || refreshCooldown) && "opacity-50 cursor-not-allowed"
                )}
              >
                {isRefreshing ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh Data
                  </>
                )}
              </Button>
              <a
                href={`https://app.hubspot.com/contacts/48291892/record/0-2/${meetingDetails.companyId}`}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: 'default' }),
                  "w-full bg-blue-600 text-primary-foreground hover:bg-blue-700 focus-visible:ring-blue-500"
                )}
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in HubSpot
              </a>
            </div>
            <AlertDialogCancel className={cn(buttonVariants({ variant: 'outline', size: 'default' }), "w-full")}>
              Close
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Deal Closed Disclaimer Dialog */}
      <AlertDialog open={showDealClosedDialog} onOpenChange={setShowDealClosedDialog}>
        <AlertDialogContent className="max-w-[350px]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="text-destructive mr-2 h-5 w-5" />
              Deal Already Closed
            </AlertDialogTitle>
            <AlertDialogDescription>
              {dealClosedStage && (
                <span>
                  This deal is already marked as <span className="font-semibold">{dealClosedStage}</span> in HubSpot.<br />
                  Please review the deal in HubSpot before proceeding.
                </span>
              )}
              {dealClosedUrl && (
                <a
                  href={dealClosedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 underline mt-2 inline-block"
                >
                  View Deal in HubSpot
                </a>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowDealClosedDialog(false);
                navigate(`/meeting/${id}/outcome`, {
                  state: {
                    dealId: meetingDetails.dealId,
                    dealName: meetingDetails.deals && meetingDetails.deals.length === 1 ? meetingDetails.deals[0].name : undefined,
                  }
                });
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Continue Anyway
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MeetingActions;

