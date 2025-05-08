import pandas as pd
import requests
import time

INPUT = 'data/shelter_all_aed_format_preprocessed.csv'
OUTPUT = 'data/shelter_all_aed_format_preprocessed_filled.csv'
REST_API_KEY = '8664cb7ae957ce6f4ec58e4fff525f88'
KAKAO_URL = 'https://dapi.kakao.com/v2/local/search/address.json'
HEADERS = {'Authorization': f'KakaoAK {REST_API_KEY}'}

def geocode_address(addr):
    params = {'query': addr}
    try:
        resp = requests.get(KAKAO_URL, headers=HEADERS, params=params)
        if resp.status_code != 200:
            return None, None
        docs = resp.json().get('documents')
        if not docs:
            return None, None
        return float(docs[0]['y']), float(docs[0]['x'])
    except Exception as e:
        print(f'Error geocoding {addr}: {e}')
        return None, None

def main():
    df = pd.read_csv(INPUT)
    fill_count = 0
    for idx, row in df.iterrows():
        lat = row['latitude']
        lng = row['longitude']
        install = str(row['설치 위치']).strip() if '설치 위치' in row else ''
        address = str(row['도로명주소']).strip() if '도로명주소' in row else ''
        # 둘 다 값이 있어야만 geocoding 시도
        if (pd.isnull(lat) or pd.isnull(lng) or lat == '' or lng == ''):
            if install and address:
                query = f"{install}, {address}"
                new_lat, new_lng = geocode_address(query)
                if new_lat is not None and new_lng is not None:
                    df.at[idx, 'latitude'] = new_lat
                    df.at[idx, 'longitude'] = new_lng
                    fill_count += 1
                    print(f"[{idx+1}] {query} → lat: {new_lat}, lng: {new_lng}")
                else:
                    df.at[idx, 'latitude'] = ''
                    df.at[idx, 'longitude'] = ''
                time.sleep(0.12)  # 카카오 API 초당 10회 제한 대응
            else:
                df.at[idx, 'latitude'] = ''
                df.at[idx, 'longitude'] = ''
    df.to_csv(OUTPUT, index=False, encoding='utf-8-sig')
    print(f'✅ 좌표 보완 완료: {OUTPUT} (총 {fill_count}건 보완)')

if __name__ == '__main__':
    main() 