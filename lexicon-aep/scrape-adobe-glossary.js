import axios from 'axios';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

async function scrapeGlossary() {
  try {
    console.log('Fetching glossary page...');
    const url = 'https://experienceleague.adobe.com/en/docs/real-time-cdp-collaboration/using/reference/glossary';
    const response = await axios.get(url);
    
    if (response.status !== 200) {
      throw new Error(`Failed to fetch the page. Status code: ${response.status}`);
    }
    
    console.log('Parsing HTML content...');
    const $ = cheerio.load(response.data);
    const glossaryTerms = [];
    
    // Find all definition terms in the glossary
    // Typical structure is <dt> for term name and <dd> for definition
    const dtElements = $('dt');
    
    console.log(`Found ${dtElements.length} potential glossary terms`);
    
    dtElements.each((index, element) => {
      const termElement = $(element);
      const definitionElement = termElement.next('dd');
      
      if (definitionElement.length) {
        const name = termElement.text().trim();
        const definition = definitionElement.text().trim();
        
        if (name && definition) {
          glossaryTerms.push({
            name,
            definition,
            categories: 'RT-CDP Collaboration',
            categoryIds: '29',
            isLegacy: 'false'
          });
        }
      }
    });
    
    console.log(`Successfully extracted ${glossaryTerms.length} terms with definitions`);
    
    // Create CSV content
    let csvContent = 'Term Name,Definition,Categories,Category IDs,Is Legacy,Current Term ID\n';
    
    glossaryTerms.forEach(term => {
      // Escape quotes in the CSV fields
      const escapedName = term.name.replace(/"/g, '""');
      const escapedDefinition = term.definition.replace(/"/g, '""');
      
      csvContent += `"${escapedName}","${escapedDefinition}",${term.categories},${term.categoryIds},${term.isLegacy},\n`;
    });
    
    // Get directory path for ES modules
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Write CSV file
    const outputPath = path.join(__dirname, 'tmp', 'adobe_glossary.csv');
    fs.writeFileSync(outputPath, csvContent);
    
    console.log(`CSV file created successfully at: ${outputPath}`);
    console.log('You can now import this file using the Admin interface');
    
    // Also create a cleaned version without quotes for direct display
    let cleanedCsvContent = 'Term Name,Definition,Categories,Category IDs,Is Legacy,Current Term ID\n';
    
    glossaryTerms.forEach(term => {
      cleanedCsvContent += `${term.name},${term.definition},${term.categories},${term.categoryIds},${term.isLegacy},\n`;
    });
    
    const cleanedOutputPath = path.join(__dirname, 'tmp', 'adobe_glossary_cleaned.csv');
    fs.writeFileSync(cleanedOutputPath, cleanedCsvContent);
    
    return { count: glossaryTerms.length, path: outputPath };
    
  } catch (error) {
    console.error('Error scraping glossary:', error);
    throw error;
  }
}

// Run the scraper
scrapeGlossary()
  .then(result => {
    console.log(`Scraping completed. Extracted ${result.count} terms.`);
  })
  .catch(error => {
    console.error('Failed to scrape glossary:', error.message);
  });