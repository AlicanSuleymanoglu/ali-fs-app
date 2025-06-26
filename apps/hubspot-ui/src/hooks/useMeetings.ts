import { useEffect, useState } from "react";

// 🟢 Flat shape matches your backend response
export interface Meeting {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    address?: string;
    companyAddress?: string;
    companyName?: string;
    status?: string;
    type?: string;
    date?: string;
    dealId?: string | number; // (number in backend, but sometimes string in FE)
    companyId?: string | number;
    contactId?: string | number;
    contactPhone?: string;
    internalNotes?: string;
    companies?: Array<{ id: string; name: string; address: string }>;
    deals?: Array<{ id: string; name: string }>;
    companyCount?: number;
    dealCount?: number;
    dealStage?: string;
    contractUploaded?: boolean;

    // add other fields as needed
}

export function useMeetings(
    ownerId: string,
    startTime: number,
    endTime: number,
) {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL;

    useEffect(() => {
        if (!ownerId) return;

        setLoading(true);

        fetch(`${BASE_URL}/api/meetings`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ ownerId, startTime, endTime }),
        })
            .then((res) => res.json())
            .then((data) => {
                console.log("🧪 Full response:", data); // ADD THIS
                setMeetings(data.results || []);
                setLoading(false);
            })
            .catch((err) => {
                console.error("❌ Meeting fetch failed", err);
                setLoading(false);
            });
    }, [ownerId, startTime, endTime]);

    return { meetings, loading };
}
