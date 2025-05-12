'use client';

import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useState, useCallback, useEffect } from 'react';
import { AEDLocation, parseCSV } from '@/lib/utils';
import { MapPin, Heart, Info } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 64px)'  // 네비게이션 바 높이만큼 뺌
};

const center = {
  lat: 37.5665,  // 서울시청 좌표
  lng: 126.9780
};

export default function Home() {
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [aedLocations, setAedLocations] = useState<AEDLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<AEDLocation | null>(null);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [showAED, setShowAED] = useState(true);
  const [showShelter, setShowShelter] = useState(false);
  const [shelterLocations, setShelterLocations] = useState<{ name: string; address: string; lat: number; lng: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    setIsLoading(true);
    fetch('/AED_address_geocoded.csv')
      .then(res => res.text())
      .then(text => {
        const parsed = parseCSV(text);
        setAedLocations(parsed);
        setIsLoading(false);
      })
      .catch(error => {
        console.error('AED 데이터 로딩 실패:', error);
        setIsLoading(false);
      });
    // 대피소 데이터 fetch
    fetch('/shelter_all_aed_format_preprocessed_filled.csv')
      .then(res => res.text())
      .then(text => {
        const rows = text.split('\n').slice(1); // 헤더 제외
        const shelters = rows.map(row => {
          const cols = row.split(',');
          return {
            name: cols[2],
            address: cols[3],
            lat: parseFloat(cols[5]),
            lng: parseFloat(cols[6])
          };
        }).filter(s => !isNaN(s.lat) && !isNaN(s.lng));
        setShelterLocations(shelters);
      });
  }, []);

  const onLoad = useCallback((map: google.maps.Map) => {
    setMap(map);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({ lat: latitude, lng: longitude });
          if (map) {
            map.panTo({ lat: latitude, lng: longitude });
          }
        },
        (error) => {
          console.error('위치 정보를 가져오는데 실패했습니다:', error);
        }
      );
    }
  }, [map]);

  const filteredLocations = aedLocations.filter(location => 
    location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    location.address.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // 대피소/소화기 마커 예시 좌표 (실제 데이터 연동 전 임시)
  const extinguisherMarkers = [
    { lat: 37.567, lng: 126.98, name: '소화기 예시1' },
    { lat: 37.563, lng: 126.974, name: '소화기 예시2' },
  ];

  if (!isLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">지도를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen flex flex-col">
      {/* 네비게이션 바 */}
      <nav className="h-auto min-h-20 bg-white shadow-md flex flex-wrap items-center px-2 gap-2 sm:gap-4 sm:px-4 overflow-x-auto">
        <div className="flex items-center gap-1 sm:gap-2 mr-2 sm:mr-6">
          <Heart className="w-6 h-6 text-red-500" />
          <h1 className="text-lg sm:text-2xl font-extrabold text-black">안전 지도</h1>
        </div>
        <button
          onClick={getCurrentLocation}
          className="flex items-center gap-1 px-2 py-1 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold text-sm"
        >
          <MapPin className="w-4 h-4" />
          <span>현재 위치</span>
        </button>
        <label className="flex items-center gap-1 px-2 py-1 ml-2 bg-white border-2 border-blue-500 rounded-lg cursor-pointer hover:bg-blue-50 transition-colors font-semibold text-sm">
          <input
            type="checkbox"
            checked={showAED}
            onChange={() => setShowAED(v => !v)}
            className="w-4 h-4 text-blue-500 accent-blue-500"
          />
          <span className="text-blue-700">AED</span>
        </label>
        <label className="flex items-center gap-1 px-2 py-1 ml-2 bg-white border-2 border-green-500 rounded-lg cursor-pointer hover:bg-green-50 transition-colors font-semibold text-sm">
          <input
            type="checkbox"
            checked={showShelter}
            onChange={() => setShowShelter(v => !v)}
            className="w-4 h-4 text-green-500 accent-green-500"
          />
          <span className="text-green-700">대피소</span>
        </label>
        <label className="flex items-center gap-1 px-2 py-1 ml-2 bg-white border-2 border-red-500 rounded-lg cursor-pointer hover:bg-red-50 transition-colors font-semibold opacity-60 text-sm">
          <input
            type="checkbox"
            disabled
            className="w-4 h-4 text-red-500 accent-red-500"
          />
          <span className="text-red-700">소화기</span>
        </label>
        <label className="flex items-center gap-1 px-2 py-1 ml-2 bg-white border-2 border-purple-500 rounded-lg cursor-pointer hover:bg-purple-50 transition-colors font-semibold opacity-60 text-sm">
          <input
            type="checkbox"
            disabled
            className="w-4 h-4 text-purple-500 accent-purple-500"
          />
          <span className="text-purple-700">응급실</span>
        </label>
        <label className="flex items-center gap-1 px-2 py-1 ml-2 bg-white border-2 border-gray-400 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors font-semibold opacity-60 text-sm">
          <input
            type="checkbox"
            disabled
            className="w-4 h-4 text-gray-400 accent-gray-400"
          />
          <span className="text-gray-700">기타</span>
        </label>
      </nav>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 relative overflow-hidden">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-50">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-600">AED 데이터를 불러오는 중...</p>
            </div>
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={{ width: '100%', height: '100%' }}
            center={center}
            zoom={15}
            onLoad={onLoad}
            onUnmount={onUnmount}
            options={{
              gestureHandling: 'greedy',
              styles: [
                {
                  featureType: "poi",
                  elementType: "labels",
                  stylers: [{ visibility: "off" }]
                }
              ]
            }}
          >
            {/* AED 마커 */}
            {showAED && filteredLocations.map((location, index) => (
              <Marker
                key={index}
                position={{ lat: location.lat, lng: location.lng }}
                onClick={() => setSelectedLocation(location)}
                icon={
                  isLoaded && window.google
                    ? {
                        url: '/aed-marker.png',
                        scaledSize: new window.google.maps.Size(32, 32)
                      }
                    : undefined
                }
              />
            ))}
            {/* 대피소 마커 */}
            {showShelter && shelterLocations.map((marker, idx) => (
              <Marker
                key={`shelter-${idx}`}
                position={{ lat: marker.lat, lng: marker.lng }}
                icon={
                  isLoaded && window.google
                    ? {
                        url: '/shelter.svg',
                        scaledSize: new window.google.maps.Size(32, 32)
                      }
                    : undefined
                }
              />
            ))}
            {/* 소화기 마커 예시 */}
            {extinguisherMarkers.map((marker, idx) => (
              <Marker
                key={`extinguisher-${idx}`}
                position={{ lat: marker.lat, lng: marker.lng }}
                icon={
                  isLoaded && window.google
                    ? {
                        url: '/fire_extinguisher.svg',
                        scaledSize: new window.google.maps.Size(32, 32)
                      }
                    : undefined
                }
              />
            ))}

            {selectedLocation && (
              <InfoWindow
                position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
                onCloseClick={() => setSelectedLocation(null)}
              >
                <div className="p-3 max-w-xs">
                  <h3 className="font-bold text-lg mb-2">{selectedLocation.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{selectedLocation.address}</p>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Info className="w-4 h-4" />
                    <span>24시간 운영</span>
                  </div>
                </div>
              </InfoWindow>
            )}

            {userLocation && (
              <Marker
                position={userLocation}
                icon={
                  isLoaded && window.google
                    ? {
                        url: '/user-location.png',
                        scaledSize: new window.google.maps.Size(32, 32)
                      }
                    : undefined
                }
              />
            )}
          </GoogleMap>
        )}
      </div>
    </div>
  );
}
