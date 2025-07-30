
// src/components/LoginButton.tsx
import React from 'react';
import { Button } from "./ui/button";

const LoginButton = () => {
  const handleLogin = () => {
    globalThis.location.href = 'https://sales.allo.restaurant/auth/login'; // Update to backend URL
  };

  return (
    <Button
      onClick={handleLogin}
      className="bg-[#E9A68A] hover:bg-[#d9957a] text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
    >
      Log in with HubSpot Test
    </Button>
  );
};

export default LoginButton;
