import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export interface AEDLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const parseCSV = (csvText: string): AEDLocation[] => {
  const lines = csvText.split('\n');
  return lines.slice(1).map(line => {
    const values = line.split(',');
    return {
      name: values[0] || '',
      address: values[1] || '',
      lat: parseFloat(values[7]) || 0,
      lng: parseFloat(values[8]) || 0
    };
  }).filter(location => location.lat !== 0 && location.lng !== 0);
}; 