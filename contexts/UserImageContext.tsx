'use client';

import React, { createContext, useContext, useState } from 'react';

interface UserImageContextType {
  imageVersion: number;
  updateImage: () => void;
}

const UserImageContext = createContext<UserImageContextType | undefined>(undefined);

export const UserImageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [imageVersion, setImageVersion] = useState(0);

  const updateImage = () => {
    setImageVersion(prev => prev + 1);
  };

  return (
    <UserImageContext.Provider value={{ imageVersion, updateImage }}>
      {children}
    </UserImageContext.Provider>
  );
};

export const useUserImage = () => {
  const context = useContext(UserImageContext);
  if (context === undefined) {
    throw new Error('useUserImage must be used within a UserImageProvider');
  }
  return context;
};
