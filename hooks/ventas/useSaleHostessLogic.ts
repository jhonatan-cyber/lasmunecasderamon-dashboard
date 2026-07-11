import { useState } from 'react';

// ── Product rule detectors (pure functions, no hook needed) ─────────
export const isChampagneProduct = (producto: any): boolean => {
  const cat = (producto?.categoria || producto?.category || '').toLowerCase();
  return cat.includes('champaña') || cat.includes('shampaña') || cat.includes('champagne');
};

// ── Hostess selection state ─────────────────────────────────────────
export interface HostessSelections {
  champagneHostessSelections: { [key: string]: string[] };
  setChampagneHostessSelections: React.Dispatch<React.SetStateAction<{ [key: string]: string[] }>>;
  otherProductHostessSelections: { [key: string]: string[] };
  setOtherProductHostessSelections: React.Dispatch<
    React.SetStateAction<{ [key: string]: string[] }>
  >;
  hostessSearchValues: { [key: string]: string };
  setHostessSearchValues: React.Dispatch<React.SetStateAction<{ [key: string]: string }>>;
}

export function useSaleHostessLogic(): HostessSelections {
  const [champagneHostessSelections, setChampagneHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [otherProductHostessSelections, setOtherProductHostessSelections] = useState<{
    [key: string]: string[];
  }>({});
  const [hostessSearchValues, setHostessSearchValues] = useState<{ [key: string]: string }>({});

  return {
    champagneHostessSelections,
    setChampagneHostessSelections,
    otherProductHostessSelections,
    setOtherProductHostessSelections,
    hostessSearchValues,
    setHostessSearchValues
  };
}
