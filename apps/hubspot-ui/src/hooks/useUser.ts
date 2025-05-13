import { useEffect, useState } from "react";

export interface HubspotUser {
    name: string;
    email: string;
    user_id: string;
}

export function useUser() {
    const [user, setUser] = useState<HubspotUser | null>(null);
    const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL ?? "";

    useEffect(() => {
        fetch(`${BASE_URL}/api/me`, { credentials: "include" })
            .then((res) => res.ok ? res.json() : null)
            .then((data) => {
                if (data) {
                    setUser({
                        name: data.name,
                        email: data.email,
                        user_id: data.user_id,
                    });
                }
            })
            .catch(() => setUser(null));
    }, [BASE_URL]);

    return user;
}
