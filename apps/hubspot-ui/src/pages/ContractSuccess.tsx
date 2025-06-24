import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from "../components/ui/button.tsx";
import { Home } from "lucide-react";
import { motion } from "framer-motion";

const ContractSuccess: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleHome = () => {
    // Save completed deal to sessionStorage if present
    if (location.state?.completedDealId && location.state?.completedDealStatus) {
      const sessionCompleted = JSON.parse(sessionStorage.getItem('completedDeals') || '{}');
      sessionCompleted[location.state.completedDealId] = location.state.completedDealStatus;
      sessionStorage.setItem('completedDeals', JSON.stringify(sessionCompleted));
    }
    if (location.state?.completedDeals && location.state?.meetingId) {
      // Multi-deal flow: go back to DealSelector
      navigate(`/meeting/${location.state.meetingId}/outcome`, {
        state: {
          completedDeals: location.state.completedDeals,
          completedDealId: location.state.completedDealId,
          completedDealStatus: location.state.completedDealStatus,
        }
      });
    } else {
      // Single deal: go to dashboard
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-50 to-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full mx-auto text-center p-8 rounded-lg shadow-lg bg-white"
      >
        <div className="text-5xl mb-6">🎊</div>
        <h1 className="text-3xl font-bold mb-2">Congratulations!</h1>
        <h2 className="text-xl text-gray-800 mb-6">on your signing 🎉</h2>
        <p className="text-gray-600 mb-8">
          You've successfully completed the contract process. Your deal is now ready for processing!
        </p>
        <Button
          onClick={handleHome}
          className="w-full md:w-auto px-6 py-2 flex items-center justify-center gap-2"
        >
          <Home className="w-4 h-4" />
          {location.state?.completedDeals ? "Back to Deals" : "Homepage"}
        </Button>
      </motion.div>
    </div>
  );
};

export default ContractSuccess;
