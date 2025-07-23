import React from 'react';
import { useUser } from "../hooks/useUser.ts";
import { User } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "./ui/tooltip.tsx";

interface UserProfileProps {
  small?: boolean;
  onClick?: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ small = false, onClick }) => {
  const user = useUser();

  if (!user) return null;

  const displayName = user.name
    ? user.name.split('@')[0]
    : 'User';

  if (small) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <User
              onClick={onClick}
              className="h-4 w-4 text-blue-500 cursor-pointer"
            />
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
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-blue-500" />
          <p className="text-base font-medium">{displayName}</p>
        </div>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
};

export default UserProfile;
