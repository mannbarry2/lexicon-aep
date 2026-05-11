const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const fetch = require('node-fetch');

async function importGlossaryTerms() {
  try {
    // Read and parse CSV file
    const csvFilePath = path.join(__dirname, 'tmp', 'cleaned_glossary.csv');
    const csvContent = fs.readFileSync(csvFilePath, 'utf8');
    
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} terms to import`);
    
    // Process records
    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    
    for (const [index, record] of records.entries()) {
      try {
        // Convert isLegacy to boolean
        const isLegacy = typeof record['Is Legacy'] === 'string' 
          ? record['Is Legacy'].toLowerCase() === 'true' 
          : Boolean(record['Is Legacy']);
        
        // Prepare data for API
        const termData = {
          name: record['Term Name'],
          definition: record['Definition'],
          categories: record['Categories'].split(',').map(cat => cat.trim()),
          categoryIds: record['Category IDs'].split(',').map(id => parseInt(id.trim())),
          isLegacy,
          currentTermId: record['Current Term ID'] ? parseInt(record['Current Term ID']) : null
        };
        
        // Skip if required fields are missing
        if (!termData.name || !termData.definition) {
          console.log(`Skipping record #${index + 1} due to missing required fields`);
          skippedCount++;
          continue;
        }
        
        // Make API call to create term
        const response = await fetch('http://localhost:5000/api/terms', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(termData),
        });
        
        if (response.status === 201) {
          successCount++;
          console.log(`Successfully imported term #${index + 1}: ${termData.name}`);
        } else if (response.status === 409) {
          console.log(`Term #${index + 1} already exists: ${termData.name}`);
          skippedCount++;
        } else {
          console.error(`Failed to import term #${index + 1}: ${termData.name}. Status: ${response.status}`);
          const errorData = await response.text();
          console.error(`Error details: ${errorData}`);
          failedCount++;
        }
        
        // Add a small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (error) {
        console.error(`Error processing record #${index + 1}:`, error);
        failedCount++;
      }
    }
    
    console.log('\nImport Summary:');
    console.log(`Total terms processed: ${records.length}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Skipped (already exists): ${skippedCount}`);
    console.log(`Failed: ${failedCount}`);
    
  } catch (error) {
    console.error('Error importing glossary terms:', error);
  }
}

// Run the import function
importGlossaryTerms().then(() => {
  console.log('Import process completed');
});