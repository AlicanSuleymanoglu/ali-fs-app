import { toast } from "sonner";
import { addWeeks, endOfWeek, getTime, startOfWeek } from "date-fns";

export const refreshMeetings = async (
    userId: string,
    setMeetings: (meetings: any[]) => void,
) => {
    if (!userId) {
        toast.error("User not found");
        return;
    }

    try {
        const startTime = getTime(startOfWeek(new Date(), { weekStartsOn: 1 }));
        const endTime = getTime(
            endOfWeek(addWeeks(new Date(), 1), { weekStartsOn: 1 }),
        );

        const res = await fetch(
            `${import.meta.env.VITE_PUBLIC_API_BASE_URL}/api/meetings`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                    ownerId: userId,
                    startTime,
                    endTime,
                    forceRefresh: true,
                }),
            },
        );

        if (!res.ok) {
            throw new Error("Failed to refresh meetings");
        }

        const data = await res.json();
        const hubspotMeetings = (data.results || []).map((item: any) => {
            // Clean up internal notes by removing HTML tags and extra whitespace
            let cleanNotes = item.internalNotes || "";
            if (cleanNotes) {
                // Remove HTML tags and decode HTML entities
                cleanNotes = cleanNotes
                    .replace(/<[^>]*>/g, "") // Remove HTML tags
                    .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
                    .replace(/&amp;/g, "&") // Replace &amp; with &
                    .replace(/&lt;/g, "<") // Replace &lt; with <
                    .replace(/&gt;/g, ">") // Replace &gt; with >
                    .replace(/\s+/g, " ") // Replace multiple spaces with single space
                    .trim(); // Remove leading/trailing whitespace
            }

            return {
                id: item.id,
                title: item.title,
                contactName: item.contactName,
                companyName: item.companyName,
                startTime: item.startTime,
                endTime: item.endTime,
                date: item.date,
                type: item.type,
                status: item.status,
                address: item.address,
                companyAddress: item.companyAddress,
                dealId: item.dealId,
                companyId: item.companyId,
                contactId: item.contactId,
                contactPhone: item.contactPhone,
                internalNotes: cleanNotes,
                companies: item.companies,
                deals: item.deals,
                companyCount: item.companyCount,
                dealCount: item.dealCount,
                dealStage: item.dealStage,
                contractUploaded: item.contractUploaded,
            };
        });

        setMeetings(hubspotMeetings);
        return hubspotMeetings;
    } catch (err) {
        console.error("Failed to refresh meetings:", err);
        toast.error("Failed to refresh meetings");
        throw err;
    }
};
