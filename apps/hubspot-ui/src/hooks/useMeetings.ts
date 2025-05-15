import { useEffect, useState } from "react";

// 🟢 Flat shape matches your backend response
export interface Meeting {
    id: string;
    title: string;
    startTime: string;
    endTime: string;
    address?: string;
    companyName?: string;
    status?: string;
    type?: string;
    date?: string;
    dealId?: string | number; // (number in backend, but sometimes string in FE)
    companyId?: string | number;
    contactId?: string | number;
    internalNotes?: string;
    // add other fields as needed
}

export function useMeetings(
    ownerId: string,
    startTime: number,
    endTime: number,
) {
    const [meetings, setMeetings] = useState<Meeting[]>([]);
    const [loading, setLoading] = useState(true);
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
