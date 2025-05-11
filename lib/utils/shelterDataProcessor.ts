import { Shelter, RawShelterData, ShelterType } from '../types/shelter';
import { v4 as uuidv4 } from 'uuid';

// 컬럼명 매핑 정의
const COLUMN_MAPPINGS = {
  name: ['대피소명', '시설명', '명칭', '대피소', '시설물명', '대피소_명칭'],
  address: ['주소', '소재지', '위치', '대피소_위치', '시설물주소', '도로명주소', '지번주소'],
  lat: ['위도', 'lat', 'latitude', 'LAT', 'Latitude', '대피소_위도'],
  lng: ['경도', 'lng', 'longitude', 'LNG', 'Longitude', '대피소_경도'],
  capacity: ['수용인원', '수용능력', '수용가능인원', '최대수용인원', '대피소_수용인원'],
  contact: ['연락처', '전화번호', '담당자연락처', '관리자연락처', '대피소_연락처'],
  facilities: ['시설', '부대시설', '편의시설', '대피소_시설']
};

// 주소에서 지역명 추출
function extractRegion(address: string): string {
  const regionMatch = address.match(/^(서울특별시|부산광역시|대구광역시|인천광역시|광주광역시|대전광역시|울산광역시|세종특별자치시|경기도|강원도|충청북도|충청남도|전라북도|전라남도|경상북도|경상남도|제주특별자치도)/);
  return regionMatch ? regionMatch[1] : '기타';
}

// 파일명에서 대피소 유형 추출
function extractTypeFromFileName(fileName: string): ShelterType {
  const typeMap: Record<string, ShelterType> = {
    '지진': '지진',
    '수해': '수해',
    '산사태': '산사태',
    '해일': '해일'
  };

  for (const [key, value] of Object.entries(typeMap)) {
    if (fileName.includes(key)) return value;
  }
  return '기타';
}

// 컬럼명으로 값 찾기
function findValueByColumnNames(data: RawShelterData, columnNames: string[]): string | number | string[] | undefined {
  for (const name of columnNames) {
    if (data[name] !== undefined && data[name] !== null && data[name] !== '') {
      return data[name] as string | number | string[];
    }
  }
  return undefined;
}

// 좌표 정보 처리
function extractLocation(data: RawShelterData): { lat: number; lng: number } | null {
  let lat = findValueByColumnNames(data, COLUMN_MAPPINGS.lat);
  let lng = findValueByColumnNames(data, COLUMN_MAPPINGS.lng);

  // string[]일 경우 첫 번째 값만 사용
  if (Array.isArray(lat)) lat = lat[0];
  if (Array.isArray(lng)) lng = lng[0];

  if (!lat || !lng) return null;

  // 문자열을 숫자로 변환
  const numLat = typeof lat === 'string' ? parseFloat(lat) : lat;
  const numLng = typeof lng === 'string' ? parseFloat(lng) : lng;

  // 유효한 좌표값 확인
  if (isNaN(numLat) || isNaN(numLng)) return null;
  if (numLat < -90 || numLat > 90 || numLng < -180 || numLng > 180) return null;

  return { lat: numLat, lng: numLng };
}

// 주소 정규화
function normalizeAddress(address: string): string {
  return address
    .replace(/\s+/g, ' ')  // 연속된 공백을 하나로
    .replace(/[()]/g, '')  // 괄호 제거
    .replace(/,/g, '')     // 쉼표 제거
    .trim();               // 앞뒤 공백 제거
}

// 데이터 정규화
export function normalizeShelterData(rawData: RawShelterData, fileName: string): Partial<Shelter> {
  // 기본 정보 추출
  const name = findValueByColumnNames(rawData, COLUMN_MAPPINGS.name);
  const address = findValueByColumnNames(rawData, COLUMN_MAPPINGS.address);
  const location = extractLocation(rawData);
  
  if (!name || !address) {
    console.warn(`Missing required fields in file ${fileName}`);
    return {};
  }

  // 타입 가드 및 변환
  const nameStr = Array.isArray(name) ? name[0] : String(name);
  const addressStr = Array.isArray(address) ? address[0] : String(address);
  const capacityVal = findValueByColumnNames(rawData, COLUMN_MAPPINGS.capacity);
  const capacity = typeof capacityVal === 'number' ? capacityVal : (typeof capacityVal === 'string' ? parseInt(capacityVal, 10) : undefined);
  const contactVal = findValueByColumnNames(rawData, COLUMN_MAPPINGS.contact);
  const contact = Array.isArray(contactVal) ? contactVal[0] : (contactVal ? String(contactVal) : undefined);
  const facilitiesVal = findValueByColumnNames(rawData, COLUMN_MAPPINGS.facilities);
  const facilities = Array.isArray(facilitiesVal) ? facilitiesVal : (typeof facilitiesVal === 'string' ? [facilitiesVal] : undefined);

  const normalized: Partial<Shelter> = {
    id: uuidv4(),
    name: nameStr.trim(),
    address: normalizeAddress(addressStr),
    type: extractTypeFromFileName(fileName),
    details: {
      capacity,
      contact,
      facilities,
      lastUpdated: new Date()
    },
    source: {
      region: extractRegion(addressStr),
      originalFile: fileName,
      lastUpdated: new Date()
    }
  };

  // 좌표 정보가 있는 경우에만 추가
  if (location) {
    normalized.location = location;
  }

  return normalized;
}

// 중복 제거
export function removeDuplicates(data: Partial<Shelter>[]): Partial<Shelter>[] {
  const uniqueMap = new Map<string, Partial<Shelter>>();
  
  data.forEach(item => {
    if (!item.address || !item.name) return;
    
    const key = `${normalizeAddress(item.address)}_${item.name.trim()}`;
    if (!uniqueMap.has(key)) {
      uniqueMap.set(key, item);
    }
  });

  return Array.from(uniqueMap.values());
}

// 데이터 검증
export function validateShelterData(data: Partial<Shelter>): boolean {
  // 필수 필드 검증
  if (!data.name || !data.address) return false;
  
  // 이름과 주소가 의미 있는 값인지 검증
  if (data.name.length < 2 || data.address.length < 5) return false;

  // 좌표 정보가 없어도 유효한 데이터로 처리
  if (data.location) {
    if (isNaN(data.location.lat) || isNaN(data.location.lng)) return false;
    if (data.location.lat < 33 || data.location.lat > 39) return false;  // 한국 위도 범위
    if (data.location.lng < 124 || data.location.lng > 132) return false;  // 한국 경도 범위
  }

  return true;
} 