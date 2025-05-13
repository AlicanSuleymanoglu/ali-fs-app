import { useEffect, useState } from "react";
import { Task } from "../types/index.ts";
import { v4 as uuidv4 } from "uuid";
import { isPast, isSameDay } from "date-fns";
import { useUser } from "./useUser.ts";

interface CreateTaskInput {
    restaurantName: string;
    moreInfo?: string;
    dueDate: string;
    subject?: string;
}

export const useTasks = () => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const user = useUser();
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const unreadCount = tasks.filter((task) => !task.isRead).length;

    useEffect(() => {
        const fetchTasks = async () => {
            if (!user || !user.user_id) return;

            try {
                const res = await fetch(`${BASE_URL}/api/tasks`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ownerId: user.user_id }),
                });
                if (!res.ok) throw new Error("Failed to fetch tasks");
                const data = await res.json();
                setTasks(
                    (Array.isArray(data.tasks) ? data.tasks : []).map(
                        (task: any) => {
                            console.log(
                                "🧠 Deal ID for task",
                                task.id,
                                ":",
                                task.dealId,
                            ); // ✅ ADD THIS
                            console.log("🕒 Raw dueDate:", task.dueDate);
                            console.log(
                                "📅 Parsed dueDate:",
                                new Date(Number(task.dueDate)),
                            );

                            return {
                                id: task.id,
                                subject: task.subject,
                                body: task.body,
                                contactName: task.contactName ||
                                    "Unknown Contact",
                                phoneNumber: task.phoneNumber,
                                email: task.email,
                                restaurantName: task.restaurantName ||
                                    "Unknown Restaurant",
                                cuisine: task.cuisine,
                                createdAt: task.createdAt
                                    ? new Date(task.createdAt)
                                    : new Date(),
                                dueDate: task.dueDate
                                    ? new Date(task.dueDate)
                                    : new Date(),
                                isRead: false,
                                completed: task.status === "COMPLETED",
                                disqualified: false,
                                dealId: task.dealId,
                                contactId: task.contactId || "",
                                companyId: task.companyId || "",
                                companyAddress: task.companyAddress || "",
                            };
                        },
                    ),
                );
            } catch (error) {
                console.error("Error fetching tasks:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, [user]);

    const markAsRead = (taskId: string) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId ? { ...task, isRead: true } : task
            )
        );
    };

    const markAllAsRead = () => {
        setTasks((prev) => prev.map((task) => ({ ...task, isRead: true })));
    };

    const markAsCompleted = async (taskId: string) => {
        try {
            const res = await fetch(
                `${BASE_URL}/api/hubspot/tasks/complete`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ taskId }),
                },
            );

            if (!res.ok) throw new Error("Failed to mark task as completed");

            setTasks((prev) =>
                prev.map((task) =>
                    task.id === taskId ? { ...task, completed: true } : task
                )
            );
        } catch (err) {
            console.error("❌ Error completing task:", err);
        }
    };

    const disqualifyTask = (
        taskId: string,
        reason: string,
        otherReason?: string,
    ) => {
        setTasks((prev) =>
            prev.map((task) =>
                task.id === taskId
                    ? {
                        ...task,
                        disqualified: true,
                        disqualifyReason: reason,
                        disqualifyOtherReason: otherReason,
                    }
                    : task
            )
        );
    };

    const createTask = (taskInput: Partial<CreateTaskInput>) => {
        const newTask: Task = {
            id: uuidv4(),
            subject: taskInput.subject || "Untitled Task",
            contactName: "New Contact",
            phoneNumber: "",
            email: "",
            restaurantName: taskInput.restaurantName ?? "",
            cuisine: "",
            createdAt: new Date().toISOString(),
            dueDate: taskInput.dueDate || new Date().toISOString(),
            isRead: false,
            completed: false,
            disqualified: false,
            moreInfo: taskInput.moreInfo,
            dealId: "",
            contactId: "",
            companyId: "",
            companyAddress: "",
        };
        setTasks((prev) => [newTask, ...prev]);
        return newTask;
    };

    return {
        tasks,
        loading,
        unreadCount,
        markAsRead,
        markAllAsRead,
        markAsCompleted,
        disqualifyTask,
        createTask,
    };
};
