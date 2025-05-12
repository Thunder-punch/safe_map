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
    const lat = parseFloat(values[7]);
    const lng = parseFloat(values[8]);
    return {
      name: values[0] || '',
      address: values[1] || '',
      lat,
      lng
    };
  }).filter(location =>
    !isNaN(location.lat) &&
    !isNaN(location.lng) &&
    location.lat >= 33 && location.lat <= 39 &&
    location.lng >= 124 && location.lng <= 132
  );
}; 