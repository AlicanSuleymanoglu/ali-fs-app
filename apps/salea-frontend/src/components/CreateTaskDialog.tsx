
import React, { useState } from 'react';
import { format, addDays, addWeeks } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog.tsx';
import { Button } from '../components/ui/button.tsx';
import { Input } from '../components/ui/input.tsx';
import { Label } from '../components/ui/label.tsx';
import { Calendar as CalendarIcon } from 'lucide-react';
import { Calendar } from '../components/ui/calendar.tsx';
import { cn } from '../lib/utils.ts';
import { toast } from 'sonner';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onCreateTask: (taskData: {
    restaurantName: string;
    moreInfo?: string;
    dueDate: string;
  }) => void;
}

const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  isOpen,
  onOpenChange,
  onCreateTask,
}) => {
  const [newTaskCompany, setNewTaskCompany] = useState('');
  const [moreInfo, setMoreInfo] = useState('');
  const [followUpDate, setFollowUpDate] = useState<Date | undefined>(undefined);
  const [customDateMode, setCustomDateMode] = useState(false);

  const handleCreateTask = () => {
    if (!newTaskCompany || !followUpDate) {
      toast.error("Please enter required fields");
      return;
    }

    onCreateTask({
      restaurantName: newTaskCompany,
      moreInfo,
      dueDate: format(followUpDate, 'yyyy-MM-dd'),
    });

    // Reset form
    setNewTaskCompany('');
    setMoreInfo('');
    setFollowUpDate(undefined);
    setCustomDateMode(false);
  };

  const setFollowUpDays = (days: number) => {
    setFollowUpDate(addDays(new Date(), days));
    setCustomDateMode(false);
  };

  const setFollowUpWeeks = (weeks: number) => {
    setFollowUpDate(addWeeks(new Date(), weeks));
    setCustomDateMode(false);
  };

  const handleSelectCustomDate = () => setCustomDateMode(true);
  
  const handleCancelTask = () => {
    onOpenChange(false);
    setNewTaskCompany('');
    setMoreInfo('');
    setFollowUpDate(undefined);
    setCustomDateMode(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="company">Restaurant</Label>
            <Input
              id="company"
              value={newTaskCompany}
              onChange={(e) => setNewTaskCompany(e.target.value)}
              placeholder="Restaurant name"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="moreInfo">More Info (optional)</Label>
            <Input
              id="moreInfo"
              value={moreInfo}
              onChange={(e) => setMoreInfo(e.target.value)}
              placeholder="Additional information"
            />
          </div>

          <div className="grid gap-2">
            <Label>When to follow up?</Label>

            {!customDateMode && (
              <div className="space-y-2">
                <Button type="button" onClick={() => setFollowUpDays(3)} variant="outline">
                  In 3 days
                </Button>
                <Button type="button" onClick={() => setFollowUpWeeks(1)} variant="outline">
                  In 1 week
                </Button>
                <Button type="button" onClick={() => setFollowUpWeeks(2)} variant="outline">
                  In 2 weeks
                </Button>
                <Button type="button" onClick={() => setFollowUpWeeks(3)} variant="outline">
                  In 3 weeks
                </Button>
                <Button type="button" onClick={handleSelectCustomDate} variant="outline">
                  <CalendarIcon className="h-5 w-5 mr-2" />
                  Select a date
                </Button>
              </div>
            )}

            {customDateMode && (
              <div className="flex flex-col items-center space-y-2">
                <Calendar
                  mode="single"
                  selected={followUpDate}
                  onSelect={setFollowUpDate}
                  disabled={(date) => date < new Date()}
                />
                <Button type="button" onClick={() => setCustomDateMode(false)} variant="outline" size="sm">
                  Back to preset options
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col space-y-2">
            <Button type="button" onClick={handleCreateTask} disabled={!followUpDate} className="w-full">
              Create Task
            </Button>
            <Button type="button" onClick={handleCancelTask} variant="outline" className="w-full">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CreateTaskDialog;
