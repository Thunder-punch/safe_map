'use client';

import { GoogleMap, Marker, InfoWindow, useJsApiLoader } from '@react-google-maps/api';
import { useState, useCallback, useEffect } from 'react';
import { AEDLocation, parseCSV } from '@/lib/utils';

const containerStyle = {
  width: '100%',
  height: '100vh'
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

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || '',
  });

  useEffect(() => {
    fetch('/AED_address_geocoded.csv')
      .then(res => res.text())
      .then(text => {
        const parsed = parseCSV(text);
        setAedLocations(parsed);
        console.log('AED 데이터:', parsed);
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

  if (!isLoaded) {
    return <div>지도를 불러오는 중...</div>;
  }

  return (
    <div className="w-full h-screen relative">
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-4 items-center bg-white bg-opacity-80 p-2 rounded shadow">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showAED}
            onChange={() => setShowAED(v => !v)}
          />
          AED 표시
        </label>
      </div>
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={getCurrentLocation}
          className="bg-white px-4 py-2 rounded-lg shadow-md hover:bg-gray-100"
        >
          현재 위치
        </button>
      </div>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={15}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {showAED && aedLocations.map((location, index) => (
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

        {selectedLocation && (
          <InfoWindow
            position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
            onCloseClick={() => setSelectedLocation(null)}
          >
            <div className="p-2">
              <h3 className="font-bold">{selectedLocation.name}</h3>
              <p>{selectedLocation.address}</p>
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
    </div>
  );
}
