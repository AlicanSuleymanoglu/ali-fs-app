import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "../components/ui/avatar.tsx";
import { useUser } from "../hooks/useUser.ts";

interface UserProfileProps {
  small?: boolean;
}

const UserProfile: React.FC<UserProfileProps> = ({ small = false }) => {
  const user = useUser();

  if (!user) return null; // or a skeleton loader

  const avatarText = user.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2)
    : 'U';

  if (small) {
    return (
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarImage src="/placeholder.svg" alt={user.name} />
          <AvatarFallback>{avatarText}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium">{user.name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center space-x-4 p-4 bg-white/90 rounded-lg border border-gray-200 shadow-sm">
      <Avatar className="h-12 w-12">
        <AvatarImage src="/placeholder.svg" alt={user.name} />
        <AvatarFallback>{avatarText}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-base font-medium">{user.name}</p>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </div>
    </div>
  );
};

export default UserProfile;
