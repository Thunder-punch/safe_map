import { processShelterData, saveShelterData } from '../lib/utils/shelterDataPipeline';

async function main() {
  try {
    console.log('Starting shelter data processing...');
    
    // 데이터 처리
    const processedData = await processShelterData();
    console.log(`Successfully processed ${processedData.length} shelter records`);
    
    // 데이터 저장
    await saveShelterData(processedData);
    console.log('Data processing completed successfully');
  } catch (error) {
    console.error('Error in data processing:', error);
    process.exit(1);
  }
}

main(); 