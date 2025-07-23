import React from 'react';
import { useUser } from "../hooks/useUser.ts";
import { User } from "lucide-react"; // User icon from lucide-react
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip.tsx";

interface UserProfileProps {
  small?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ small = false }) => {
  const user = useUser();

  if (!user) return null; // or a skeleton loader

  // Format name by removing email domain if present
  const displayName = user.name
    ? user.name.split('@')[0]
    : 'User';

  if (small) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <User className="h-4 w-4 text-blue-500 cursor-pointer" />
          </TooltipTrigger>
          <TooltipContent side="bottom" align="center">
            <span className="text-sm font-medium">{displayName}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="flex items-center p-4 bg-white/90 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-center gap-2">
        <User className="h-5 w-5 text-blue-500" />
        <p className="text-base font-medium">{displayName}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
};

export default UserProfile;