
import React, { useEffect, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from 'react-router-dom';

import LoginButton from './components/LoginButton.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Inbox from './pages/Inbox.tsx';
import MeetingActions from './pages/MeetingActions.tsx';
import MeetingCanceled from './pages/MeetingCanceled.tsx';
import AddMeeting from './pages/AddMeeting.tsx';
import MeetingOutcome from './pages/MeetingOutcome.tsx';
import PositiveOutcome from './pages/PositiveOutcome.tsx';
import NegativeOutcome from './pages/NegativeOutcome.tsx';
import FollowUpOutcome from './pages/FollowUpOutcome.tsx';
import ContractSuccess from './pages/ContractSuccess.tsx';

import { MeetingProvider } from './context/MeetingContext.tsx';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const BASE_URL = import.meta.env.VITE_PUBLIC_API_BASE_URL;


  useEffect(() => {
    fetch(`${BASE_URL}/api/hubspot-data`, {
      credentials: 'include'
    })
      .then(res => {
        if (res.status === 200 || res.status === 304) {
          setIsAuthenticated(true);
          console.log(isAuthenticated);
          console.log(setIsAuthenticated);
        } else {
          setIsAuthenticated(false);
          console.log(isAuthenticated);
          console.log(setIsAuthenticated);
        }
      })
      .catch(() => setIsAuthenticated(false));
    console.log(isAuthenticated);
    console.log(setIsAuthenticated);
  }, []);

  return (
    <MeetingProvider>
      <Router>
        <Routes>
          <Route
            path="/"
            element={
              isAuthenticated ? <Navigate to="/dashboard" /> : (
                <div className="min-h-screen bg-gradient-to-b from-gray-100 to-white flex flex-col items-center justify-center p-6">
                  <div className="max-w-md w-full flex flex-col items-center">
                    <div className="mb-8 bg-[#E9A68A] w-32 h-32 rounded-3xl flex items-center justify-center">
                      <img
                        src="/lovable-uploads/ffa9c1a8-986c-43a5-a4d3-85f80bc51bf9.png"
                        alt="ali logo"
                        className="w-full h-auto"
                      />
                    </div>
                    <h1 className="text-4xl font-bold mb-2 text-gray-900">ali</h1>
                    <h2 className="text-xl text-gray-600 mb-8">Field Sales App</h2>
                    <div className="w-full max-w-xs">
                      <LoginButton />
                    </div>
                    <p className="mt-8 text-sm text-gray-500">
                      Connect your HubSpot account to continue
                    </p>
                  </div>
                </div>
              )
            }
          />
          <Route
            path="/dashboard"
            element={
              isAuthenticated ? <Dashboard /> : <Navigate to="/" />
            }
          />
          {/* 📨 Inbox/Tasks route */}
          <Route
            path="/inbox"
            element={
              isAuthenticated ? <Inbox /> : <Navigate to="/" />
            }
          />
          <Route
            path="/meeting/:id"
            element={
              isAuthenticated ? <MeetingActions /> : <Navigate to="/" />
            }
          />
          <Route
            path="/add-meeting"
            element={isAuthenticated ? <AddMeeting /> : <Navigate to="/" />}
          />
          <Route
            path="/meeting-canceled"
            element={<MeetingCanceled />}
          />
          <Route
            path="/meeting/:id/outcome"
            element={isAuthenticated ? <MeetingOutcome /> : <Navigate to="/" />}
          />
          <Route
            path="/meeting/:id/follow-up"
            element={isAuthenticated ? <FollowUpOutcome /> : <Navigate to="/" />}
          />
          {/* Outcome-specific routes */}
          <Route
            path="/meeting/:id/positive"
            element={isAuthenticated ? <PositiveOutcome /> : <Navigate to="/" />}
          />
          <Route
            path="/meeting/:id/negative"
            element={isAuthenticated ? <NegativeOutcome /> : <Navigate to="/" />}
          />
          {/* Contract success page */}
          <Route
            path="/contract-success"
            element={isAuthenticated ? <ContractSuccess /> : <Navigate to="/" />}
          />
          <Route path="*" element={<div>404 Not Found</div>} />
        </Routes>
      </Router>
    </MeetingProvider>
  );
}

export default App;
