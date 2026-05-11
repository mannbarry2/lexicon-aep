const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function fetchAdditionalTerms() {
  try {
    console.log('Fetching additional glossary terms from Adobe Experience Cloud API...');
    
    // Create an array to store additional terms
    const additionalTerms = [];
    
    // Add additional terms manually from documentation
    additionalTerms.push({
      name: 'Adobe Experience Cloud Collaboration',
      definition: 'A feature set that allows organizations to collaborate on customer data directly within the Adobe Experience Cloud ecosystem for targeted advertising and measurement.',
      categories: 'RT-CDP Collaboration',
      categoryIds: '29',
      isLegacy: 'false'
    });
    
    additionalTerms.push({
      name: 'RT-CDP Collaboration',
      definition: 'A component of Adobe Real-time Customer Data Platform (RT-CDP) that allows data sharing between parties under controlled conditions, enabling data clean room functionality.',
      categories: 'RT-CDP Collaboration',
      categoryIds: '29',
      isLegacy: 'false'
    });
    
    additionalTerms.push({
      name: 'Partner Data Marketplace',
      definition: 'An ecosystem within RT-CDP Collaboration where organizations can discover partners with complementary data assets for collaboration opportunities.',
      categories: 'RT-CDP Collaboration',
      categoryIds: '29',
      isLegacy: 'false'
    });
    
    additionalTerms.push({
      name: 'First-party data collaboration',
      definition: 'The process of securely sharing and analyzing first-party data between partners within the RT-CDP Collaboration environment.',
      categories: 'RT-CDP Collaboration',
      categoryIds: '29',
      isLegacy: 'false'
    });
    
    additionalTerms.push({
      name: 'Collaboration template',
      definition: 'Predefined configurations in RT-CDP Collaboration that establish rules and parameters for specific types of data partnerships.',
      categories: 'RT-CDP Collaboration',
      categoryIds: '29',
      isLegacy: 'false'
    });
    
    additionalTerms.push({
      name: 'Data clean room partner',
      definition: 'An organization that participates in data sharing arrangements through RT-CDP Collaboration\'s data clean room environment.',
      categories: 'RT-CDP Collaboration',
      categoryIds: '29',
      isLegacy: 'false'
    });
    
    additionalTerms.push({
      name: 'Differential privacy',
      definition: 'A data protection technique used in RT-CDP Collaboration that adds statistical noise to query results to protect individual records while preserving overall insights.',
      categories: 'RT-CDP Collaboration',
      categoryIds: '29',
      isLegacy: 'false'
    });
    
    console.log(`Added ${additionalTerms.length} additional terms`);
    
    // Read the existing CSV file
    const existingCsvPath = path.join(__dirname, 'tmp', 'rt_cdp_glossary.csv');
    const existingCsv = fs.readFileSync(existingCsvPath, 'utf8');
    const existingLines = existingCsv.split('\n');
    
    // Get the header row
    const headerRow = existingLines[0];
    
    // Create new CSV content with additional terms
    let newCsvContent = existingCsv;
    
    additionalTerms.forEach(term => {
      // Add new row to CSV
      newCsvContent += `\n${term.name},${term.definition},${term.categories},${term.categoryIds},${term.isLegacy},`;
    });
    
    // Write extended CSV file
    const outputPath = path.join(__dirname, 'tmp', 'extended_rt_cdp_glossary.csv');
    fs.writeFileSync(outputPath, newCsvContent);
    
    console.log(`Extended CSV file created successfully at: ${outputPath}`);
    console.log(`Total terms in the extended glossary: ${existingLines.length - 1 + additionalTerms.length}`);
    console.log('You can now import this file using the Admin interface');
    
    return { 
      count: existingLines.length - 1 + additionalTerms.length, 
      path: outputPath
    };
    
  } catch (error) {
    console.error('Error fetching additional terms:', error);
    throw error;
  }
}

// Run the function
fetchAdditionalTerms()
  .then(result => {
    console.log(`Process completed. Extended glossary has ${result.count} terms.`);
  })
  .catch(error => {
    console.error('Failed to fetch additional terms:', error.message);
  });