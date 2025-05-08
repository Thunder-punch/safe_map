export type ShelterType = 
  | '지진'
  | '수해'
  | '산사태'
  | '해일'
  | '기타';

export interface Shelter {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  type: ShelterType;
  details: {
    capacity?: number;
    contact?: string;
    facilities?: string[];
    lastUpdated: Date;
  };
  source: {
    region: string;
    originalFile: string;
    lastUpdated: Date;
  };
}

export interface RawShelterData {
  [key: string]: any;  // 원본 데이터의 다양한 형식을 수용
} 