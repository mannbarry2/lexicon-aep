const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

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
    
    // Find all definition lists
    const dlElements = $('dl');
    console.log(`Found ${dlElements.length} definition lists`);
    
    dlElements.each((dlIndex, dlElement) => {
      // Get all dt (term) and dd (definition) elements
      const dtElements = $(dlElement).find('dt');
      console.log(`Definition list #${dlIndex + 1} has ${dtElements.length} terms`);
      
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
            console.log(`Found term: ${name}`);
          }
        }
      });
    });
    
    console.log(`Successfully extracted ${glossaryTerms.length} terms with definitions`);
    
    // Create CSV content
    let csvContent = 'Term Name,Definition,Categories,Category IDs,Is Legacy,Current Term ID\n';
    
    glossaryTerms.forEach(term => {
      // Escape quotes in the CSV fields
      const escapedName = term.name.replace(/"/g, '""');
      const escapedDefinition = term.definition.replace(/"/g, '""').replace(/\n/g, ' ');
      
      csvContent += `${escapedName},${escapedDefinition},${term.categories},${term.categoryIds},${term.isLegacy},\n`;
    });
    
    // Write CSV file
    const outputPath = path.join(__dirname, 'tmp', 'adobe_glossary.csv');
    fs.writeFileSync(outputPath, csvContent);
    
    console.log(`CSV file created successfully at: ${outputPath}`);
    console.log('You can now import this file using the Admin interface');
    
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