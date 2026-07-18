import { useState } from 'react';
import { isChampagneProduct } from '@/components/orders/productModalRules';

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
