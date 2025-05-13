
import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { format } from 'date-fns';

const Layout: React.FC = () => {
  // Get current date
  const currentDate = format(new Date(), 'dd MMM yyyy');
  
  // Add overflow hidden to body when component mounts
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'auto';
    };
  }, []);
  
  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <main className="flex-grow p-4 overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
