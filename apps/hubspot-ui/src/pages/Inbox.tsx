
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TaskCard from '../components/TaskCard.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { useTasks } from '../hooks/useTasks.ts';
import { Button } from "../components/ui/button.tsx";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../components/ui/input.tsx";

const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, markAsRead, markAsCompleted, disqualifyTask } = useTasks();
  const [taskTypeFilter, setTaskTypeFilter] = useState<'all' | 'followup' | 'cancellation'>('all');
  const [search, setSearch] = useState("");

  // Sort tasks by due date (earliest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  // Deduplicate tasks by companyId and dueDate (same day)
  const incompleteTasks = [];
  const seen = new Map();
  for (const task of sortedTasks) {
    if (task.completed || task.disqualified) continue;
    const subject = task.subject?.toLowerCase() || '';
    const isFollowup = subject.includes('followup task');
    const isCancellation = subject.includes('cancellation task');
    if (taskTypeFilter === 'followup' && !isFollowup) continue;
    if (taskTypeFilter === 'cancellation' && !isCancellation) continue;
    if (taskTypeFilter === 'all' && !(isFollowup || isCancellation)) continue;
    const companyId = task.companyId || 'unknown';
    const dueDate = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : 'unknown'; // YYYY-MM-DD
    const key = `${companyId}_${dueDate}`;
    if (!seen.has(key)) {
      seen.set(key, true);
      incompleteTasks.push(task);
    }
  }

  // Filter by restaurant name search
  const filteredTasks = search.trim().length > 0
    ? incompleteTasks.filter(task =>
      (task.restaurantName || '').toLowerCase().includes(search.trim().toLowerCase())
    )
    : incompleteTasks;

  const handleTaskClick = (taskId: string) => {
    markAsRead(taskId);
  };

  const handleTaskComplete = async (taskId: string) => {
    try {
      await markAsCompleted(taskId);
      toast.success("Task marked as completed");
    } catch (err) {
      console.error("❌ Error completing task:", err);
      toast.error("Failed to mark task as completed");
    }
  };

  const handleTaskDisqualify = (taskId: string, reason: string, otherReason?: string) => {
    disqualifyTask(taskId, reason, otherReason);
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="flex items-center mb-4">
        <Button
          variant="ghost"
          size="sm"
          className="mr-2"
          onClick={() => navigate('/dashboard')}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-xl font-semibold">My Inbox</h2>
      </div>

      {/* Search bar */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by restaurant name..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {/* Task type filter */}
      <div className="flex gap-2 mb-4">
        <Button
          variant={taskTypeFilter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTaskTypeFilter('all')}
        >
          All
        </Button>
        <Button
          variant={taskTypeFilter === 'followup' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTaskTypeFilter('followup')}
        >
          Followup Tasks
        </Button>
        <Button
          variant={taskTypeFilter === 'cancellation' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTaskTypeFilter('cancellation')}
        >
          Cancellation Tasks
        </Button>
      </div>

      <div className="mt-4">
        <div className="space-y-4">
          {filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onClick={() => handleTaskClick(task.id)}
                onComplete={handleTaskComplete}
                onDisqualify={handleTaskDisqualify}
              />
            ))
          ) : (
            <p className="text-center py-10 text-muted-foreground">
              No tasks at the moment. Great job keeping your inbox clean!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inbox;
