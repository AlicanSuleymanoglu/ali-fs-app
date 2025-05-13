
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TaskCard from '../components/TaskCard.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs.tsx";
import { Badge } from "../components/ui/badge.tsx";
import { useTasks } from '../hooks/useTasks.ts';
import { Button } from "../components/ui/button.tsx";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

const Inbox: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, markAsRead, markAsCompleted, disqualifyTask } = useTasks();
  const [activeTab, setActiveTab] = useState("incomplete");

  // Sort tasks by due date (earliest first)
  const sortedTasks = [...tasks].sort((a, b) => {
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const incompleteTasks = sortedTasks.filter((task) => !task.completed && !task.disqualified);
  const completedTasks = sortedTasks.filter((task) => task.completed || task.disqualified);

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

      <Tabs defaultValue="incomplete" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="incomplete">
            Incomplete
            {incompleteTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">{incompleteTasks.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            {completedTasks.length > 0 && (
              <Badge variant="secondary" className="ml-2">{completedTasks.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="incomplete" className="mt-4">
          <div className="space-y-4">
            {incompleteTasks.length > 0 ? (
              incompleteTasks.map(task => (
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
                No incomplete tasks at the moment. Great job keeping your inbox clean!
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="completed" className="mt-4">
          <div className="space-y-4">
            {completedTasks.length > 0 ? (
              completedTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onClick={() => handleTaskClick(task.id)}
                />
              ))
            ) : (
              <p className="text-center py-10 text-muted-foreground">
                No completed tasks yet. Your tasks will appear here once completed.
              </p>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Inbox;
