import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { parse } from 'csv-parse/sync';
import * as XLSX from 'xlsx';
import { Shelter, RawShelterData } from '../types/shelter';
import { normalizeShelterData, removeDuplicates, validateShelterData } from './shelterDataProcessor';

const RAW_DATA_DIR = 'data/raw_data/대피소';

// CSV 파일 파싱
async function parseCSVFile(filePath: string): Promise<RawShelterData[]> {
  try {
    const content = await readFile(filePath, 'utf-8');
    return parse(content, {
      columns: true,
      skip_empty_lines: true,
      encoding: 'utf-8',
      relax_quotes: true,  // 따옴표 규칙 완화
      skip_records_with_error: true  // 오류가 있는 레코드 건너뛰기
    });
  } catch (error) {
    console.error(`Error parsing CSV file ${filePath}:`, error);
    return [];
  }
}

// XLSX 파일 파싱
async function parseXLSXFile(filePath: string): Promise<RawShelterData[]> {
  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // XLSX를 JSON으로 변환
    const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);
    
    // 데이터 정규화
    return data.map((row: Record<string, unknown>) => {
      const normalizedRow: RawShelterData = {};
      
      // 컬럼명 매핑
      Object.entries(row).forEach(([key, value]) => {
        // 한글 컬럼명 처리
        if (typeof key === 'string') {
          const normalizedKey = key.trim();
          normalizedRow[normalizedKey] = value;
        }
      });
      
      return normalizedRow;
    });
  } catch (error) {
    console.error(`Error parsing XLSX file ${filePath}:`, error);
    return [];
  }
}

// 파일 파싱
async function parseFile(filePath: string): Promise<RawShelterData[]> {
  try {
    if (filePath.endsWith('.csv')) {
      return parseCSVFile(filePath);
    } else if (filePath.endsWith('.xlsx')) {
      return parseXLSXFile(filePath);
    }
    console.warn(`Unsupported file format: ${filePath}`);
    return [];
  } catch (error) {
    console.error(`Error parsing file ${filePath}:`, error);
    return [];
  }
}

// 데이터 처리 파이프라인
export async function processShelterData(): Promise<Shelter[]> {
  try {
    // 1. 모든 파일 읽기
    const files = await readdir(RAW_DATA_DIR);
    console.log(`Found ${files.length} files to process`);

    // 2. 각 파일 파싱
    const allData: Partial<Shelter>[] = [];
    for (const file of files) {
      const filePath = join(RAW_DATA_DIR, file);
      console.log(`Processing file: ${file}`);
      
      const rawData = await parseFile(filePath);
      const normalizedData = rawData.map(data => normalizeShelterData(data, file));
      allData.push(...normalizedData);
    }

    // 3. 중복 제거
    const uniqueData = removeDuplicates(allData);
    console.log(`Removed ${allData.length - uniqueData.length} duplicate entries`);

    // 4. 데이터 검증
    const validData = uniqueData.filter(validateShelterData);
    console.log(`Removed ${uniqueData.length - validData.length} invalid entries`);

    // 5. 최종 데이터 반환
    return validData as Shelter[];
  } catch (error) {
    console.error('Error processing shelter data:', error);
    throw error;
  }
}

// 데이터 저장
export async function saveShelterData(data: Shelter[]): Promise<void> {
  // TODO: 데이터베이스 저장 구현
  console.log(`Saving ${data.length} shelter records`);
} 