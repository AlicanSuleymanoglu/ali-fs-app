
import React from 'react';
import { cn } from '@/lib/utils.tsx';

interface NotificationBadgeProps {
  count: number;
  className?: string;
}

const NotificationBadge: React.FC<NotificationBadgeProps> = ({ count, className }) => {
  if (count <= 0) return null;
  
  return (
    <div className={cn(
      "absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold",
      className
    )}>
      {count > 9 ? '9+' : count}
    </div>
  );
};

export default NotificationBadge;
