import os
import pandas as pd
import glob
from openpyxl import load_workbook

RAW_DATA_DIR = 'data/raw_data/대피소'
OUTPUT = 'data/shelter_all_aed_format_preprocessed.csv'

# 각 컬럼별 우선순위 후보
DETAIL_CANDIDATES = ['상세 위치', '소재지', '위치', '대피소_위치', '설치 위치', '시설명', '대피소명', '명칭', '시설물명', '대피소_명칭']
INSTALL_CANDIDATES = ['설치 위치', '시설명', '대피소명', '명칭', '시설물명', '대피소_명칭', '상세 위치', '소재지', '위치', '대피소_위치']
ADDRESS_CANDIDATES = ['도로명주소', '주소', '지번주소', '시설물주소', '상세 위치', '소재지', '위치', '대피소_위치']
CONTACT_CANDIDATES = ['연락처', '전화번호', '담당자연락처', '관리자연락처', '대피소_연락처']
LAT_CANDIDATES = ['위도', 'lat', 'latitude', 'LAT', 'Latitude', '대피소_위도']
LNG_CANDIDATES = ['경도', 'lng', 'longitude', 'LNG', 'Longitude', '대피소_경도']

# 후보 컬럼에서 우선순위로 값 추출
def find_first_col(row, candidates):
    for c in candidates:
        if c in row and pd.notnull(row[c]) and str(row[c]).strip() != '':
            return row[c]
    return ''

def extract_from_csv(file_path):
    try:
        df = pd.read_csv(file_path, encoding='utf-8')
    except UnicodeDecodeError:
        df = pd.read_csv(file_path, encoding='cp949')
    return df

def extract_from_xlsx(file_path):
    wb = load_workbook(file_path, read_only=True)
    ws = wb.active
    data = list(ws.values)
    columns = [str(c).strip() for c in data[0]]
    rows = data[1:]
    df = pd.DataFrame(rows, columns=columns)
    return df

def main():
    all_rows = []
    files = glob.glob(os.path.join(RAW_DATA_DIR, '*.csv')) + glob.glob(os.path.join(RAW_DATA_DIR, '*.CSV')) + glob.glob(os.path.join(RAW_DATA_DIR, '*.xlsx'))
    for file in files:
        print(f"파일 처리 중: {file}")
        if file.endswith('.csv') or file.endswith('.CSV'):
            df = extract_from_csv(file)
        elif file.endswith('.xlsx'):
            df = extract_from_xlsx(file)
        else:
            continue
        for _, row in df.iterrows():
            detail = find_first_col(row, DETAIL_CANDIDATES)
            install = find_first_col(row, INSTALL_CANDIDATES)
            address = find_first_col(row, ADDRESS_CANDIDATES)
            contact = find_first_col(row, CONTACT_CANDIDATES)
            lat = find_first_col(row, LAT_CANDIDATES)
            lng = find_first_col(row, LNG_CANDIDATES)
            all_rows.append({
                '상세 위치': detail,
                '설치 위치': install,
                '도로명주소': address,
                '전화번호': contact,
                'latitude': lat,
                'longitude': lng
            })
    result = pd.DataFrame(all_rows)
    result.insert(0, '번호', range(1, len(result) + 1))
    result = result[['번호', '상세 위치', '설치 위치', '도로명주소', '전화번호', 'latitude', 'longitude']]
    result.to_csv(OUTPUT, index=False, encoding='utf-8-sig')
    print(f'✅ 전처리 완료: {OUTPUT}')

if __name__ == '__main__':
    main() 