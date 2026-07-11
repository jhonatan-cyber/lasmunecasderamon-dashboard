'use client';

import { useState, useEffect } from 'react';

const configCache: Record<string, string | number | boolean> = {};
let cacheLoaded = false;

async function ensureConfigs() {
  if (cacheLoaded) return;
  try {
    const res = await fetch('/api/configurations');
    const result = await res.json();
    if (result.success && result.data) {
      for (const category of Object.keys(result.data)) {
        for (const key of Object.keys(result.data[category])) {
          configCache[`${category}.${key}`] = result.data[category][key];
        }
      }
      cacheLoaded = true;
    }
  } catch {
    // keep defaults
  }
}

export function useConfigValue<T = string>(
  category: string,
  key: string,
  defaultValue: T
): T {
  const [value, setValue] = useState<T>(defaultValue);

  useEffect(() => {
    const cacheKey = `${category}.${key}`;
    if (configCache[cacheKey] !== undefined) {
      setValue(configCache[cacheKey] as T);
      return;
    }
    ensureConfigs().then(() => {
      if (configCache[cacheKey] !== undefined) {
        setValue(configCache[cacheKey] as T);
      }
    });
  }, [category, key, defaultValue]);

  return value;
}
