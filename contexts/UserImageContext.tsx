'use client';

import { useCallback, useEffect, useState } from 'react';

const USER_IMAGE_EVENT = 'user-image-updated';
const USER_IMAGE_KEY = '__userImageVersion';

declare global {
  interface Window {
    __userImageVersion?: number;
  }
}

function getCurrentVersion() {
  if (typeof window === 'undefined') return 0;
  return window[USER_IMAGE_KEY] ?? 0;
}

export const useUserImage = () => {
  const [imageVersion, setImageVersion] = useState(0);

  useEffect(() => {
    setImageVersion(getCurrentVersion());

    const handleImageUpdate = () => {
      setImageVersion(getCurrentVersion());
    };

    window.addEventListener(USER_IMAGE_EVENT, handleImageUpdate);
    return () => window.removeEventListener(USER_IMAGE_EVENT, handleImageUpdate);
  }, []);

  const updateImage = useCallback(() => {
    if (typeof window === 'undefined') return;

    const nextVersion = getCurrentVersion() + 1;
    window[USER_IMAGE_KEY] = nextVersion;
    window.dispatchEvent(new Event(USER_IMAGE_EVENT));
    setImageVersion(nextVersion);
  }, []);

  return {
    imageVersion,
    updateImage
  };
};
