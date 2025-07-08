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
                    let userId = data.user_id;
                    if (userId === "74750550" || userId === 74750550) {
                        userId = "207972960";
                    }
                    setUser({
                        name: data.name,
                        email: data.email,
                        user_id: userId,
                    });
                }
            })
            .catch(() => setUser(null));
    }, [BASE_URL]);

    return user;
}
