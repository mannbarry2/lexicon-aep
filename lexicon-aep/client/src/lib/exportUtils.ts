import { TermWithMetadata } from "@shared/schema";

/**
 * Strips HTML tags from a string and normalizes whitespace
 * @param html HTML string to clean
 * @returns Plain text without HTML tags
 */
function stripHtml(html: string): string {
  if (!html) return '';
  
  // Create a temporary div element to hold the HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  
  // Get the text content (this removes all HTML tags)
  let text = tempDiv.textContent || tempDiv.innerText || '';
  
  // Normalize whitespace (replace multiple spaces, newlines, etc. with a single space)
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Properly escapes a string for CSV format
 * @param value String to escape for CSV
 * @returns CSV-escaped string
 */
function escapeForCSV(value: string | number): string {
  if (value === null || value === undefined) return '';
  
  // If it's not a string, convert it to string
  const str = typeof value === 'string' ? value : String(value);
  
  // Check if the string contains any characters that need escaping
  const needsEscaping = /[",\n\r]/.test(str);
  
  if (needsEscaping) {
    // Double all double quotes and wrap in quotes
    return `"${str.replace(/"/g, '""')}"`;
  }
  
  return str;
}

/**
 * Converts term data to CSV format and triggers download
 * @param terms Array of terms with metadata to export
 * @param filename Name of the CSV file to download
 */
export function exportTermsToCSV(terms: TermWithMetadata[], filename: string = 'adobe-aep-terms.csv') {
  try {
    console.log(`Starting CSV export of ${terms.length} terms to ${filename}`);
    
    // Define CSV headers
    const headers = [
      'ID',
      'Term Name',
      'Definition',
      'Categories',
      'Category IDs',
      'Is Legacy',
      'Current Term',
      'Current Term ID',
      'Legacy Names',
      'Legacy Term IDs',
      'Upvotes',
      'Downvotes'
    ];

    // Convert each term to a CSV row
    const rows = terms.map(term => {
      // Process categories
      const categories = term.categories?.map(c => c.name).join(', ') || '';
      const categoryIds = term.categories?.map(c => c.id).join(', ') || '';
      
      // Process legacy terms with null checks
      const legacyNames = term.legacyNames?.map(l => l?.name || '').join(', ') || '';
      const legacyIds = term.legacyNames?.map(l => l?.id || '').join(', ') || '';
      
      // Process current term with null checks
      const currentTerm = term.currentTerm?.name || '';
      const currentTermId = term.currentTerm?.id || '';
      
      // Clean HTML from definition
      const cleanDefinition = stripHtml(term.definition || '');

      return [
        term.id,
        escapeForCSV(term.name || ''),
        escapeForCSV(cleanDefinition),
        escapeForCSV(categories),
        escapeForCSV(categoryIds),
        term.isLegacy ? 'Yes' : 'No',
        escapeForCSV(currentTerm),
        currentTermId,
        escapeForCSV(legacyNames),
        legacyIds,
        term.upvotes || 0,
        term.downvotes || 0
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    console.log(`Generated CSV content with ${rows.length} rows`);
    
    // Add BOM for Excel compatibility
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + csvContent;

    // Create a Blob with the CSV data
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' });
    
    console.log(`Created blob of size: ${blob.size} bytes`);
    
    // Create a download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    link.setAttribute('target', '_blank');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    
    // Trigger download and clean up
    console.log(`Triggering download of ${filename}`);
    link.click();
    
    // Cleanup after a small delay to ensure download starts
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log('CSV export completed successfully');
    }, 100);
    
    return true;
  } catch (error) {
    console.error('Error during CSV export:', error);
    return false;
  }
}