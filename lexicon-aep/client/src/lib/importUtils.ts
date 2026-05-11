import { CreateTermInput } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

export interface ImportTermData {
  id?: number;
  name: string;
  definition: string;
  categories: string[];
  categoryIds: number[];
  isLegacy: boolean;
  currentTermId?: number;
  upvotes?: number;
  downvotes?: number;
}

export interface ImportResult {
  message: string;
  isError: boolean;
}

/**
 * Type guard to check if a value is an ImportResult
 * @param value Any value to check
 * @returns True if the value matches the ImportResult interface
 */
export function isImportResult(value: any): value is ImportResult {
  return (
    value !== null &&
    typeof value === 'object' &&
    'message' in value &&
    'isError' in value &&
    typeof value.message === 'string' &&
    typeof value.isError === 'boolean'
  );
}

/**
 * Parse CSV file and return structured term data
 * @param csvText CSV content as string
 */
export function parseCSV(csvText: string): ImportTermData[] {
  const lines = csvText.split('\n');
  if (lines.length < 2) {
    console.error("CSV file has insufficient data");
    return [];
  }
  
  // Extract headers (first line)
  const headers = lines[0].split(',');
  console.log("CSV Headers:", headers);
  
  // Parse each data row
  const terms: ImportTermData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    // Split the line into fields, handling quoted values with commas
    const fields = line.split(',');
    
    // Verify we have enough fields
    if (fields.length < 2) {
      console.warn(`Skipping line ${i}, insufficient fields: ${line}`);
      continue;
    }

    try {
      // Extract categories from field 3
      let categories: string[] = [];
      if (fields[3] && fields[3].trim()) {
        const categoriesField = fields[3].trim();
        if (categoriesField.startsWith('[') && categoriesField.endsWith(']')) {
          try {
            // Replace single quotes with double quotes for JSON parsing
            const jsonStr = categoriesField.replace(/'/g, '"');
            categories = JSON.parse(jsonStr);
          } catch (e) {
            console.warn(`Error parsing categories JSON: ${categoriesField}`, e);
            // Fallback: treat as comma-separated string
            categories = categoriesField
              .replace(/^\[|\]$/g, '') // Remove brackets
              .split(',')
              .map(c => c.trim().replace(/^["']|["']$/g, '')); // Trim and remove quotes
          }
        } else {
          // Not in JSON format, treat as comma-separated string
          categories = categoriesField.split(',').map(c => c.trim());
        }
      }
      
      // Extract category IDs from field 4
      let categoryIds: number[] = [];
      if (fields[4] && fields[4].trim()) {
        const categoryIdsField = fields[4].trim();
        if (categoryIdsField.startsWith('[') && categoryIdsField.endsWith(']')) {
          try {
            // Replace single quotes with double quotes for JSON parsing
            const jsonStr = categoryIdsField.replace(/'/g, '"');
            categoryIds = JSON.parse(jsonStr);
          } catch (e) {
            console.warn(`Error parsing category IDs JSON: ${categoryIdsField}`, e);
            // Fallback: treat as comma-separated string of numbers
            categoryIds = categoryIdsField
              .replace(/^\[|\]$/g, '') // Remove brackets
              .split(',')
              .map(id => {
                const parsed = parseInt(id.trim());
                return isNaN(parsed) ? 0 : parsed;
              });
          }
        } else {
          // Not in JSON format, treat as comma-separated string of numbers
          categoryIds = categoryIdsField.split(',').map(id => {
            const parsed = parseInt(id.trim());
            return isNaN(parsed) ? 0 : parsed;
          });
        }
      }
      
      // Map fields to term structure
      const term: ImportTermData = {
        id: fields[0] && fields[0].trim() ? parseInt(fields[0].trim()) : undefined,
        name: fields[1] ? fields[1].trim().replace(/^["']|["']$/g, '') : '',
        definition: fields[2] ? fields[2].trim().replace(/^["']|["']$/g, '') : '',
        categories: categories,
        categoryIds: categoryIds,
        isLegacy: fields[5] === 'Yes',
        currentTermId: fields[7] && fields[7].trim() ? parseInt(fields[7].trim()) : undefined,
        upvotes: fields[10] && fields[10].trim() ? parseInt(fields[10].trim()) : 0,
        downvotes: fields[11] && fields[11].trim() ? parseInt(fields[11].trim()) : 0
      };
      
      // Validate term has required fields
      if (!term.name) {
        console.warn(`Skipping row ${i}, missing term name:`, fields);
        continue;
      }
      
      // Add valid term to the list
      terms.push(term);
    } catch (error) {
      console.error(`Error processing row ${i}:`, error, fields);
      // Skip this row but continue processing
    }
  }
  
  console.log(`Successfully parsed ${terms.length} terms from CSV with ${lines.length-1} rows`);
  return terms;
}

/**
 * Import terms from parsed CSV data
 * @param terms Array of parsed term data
 * @param onProgress Callback for progress updates
 * @param onComplete Callback when import is complete
 * @param onError Callback for error handling
 */
// Note: We're using the type guard defined above

export async function importTerms(
  terms: ImportTermData[],
  onProgress: (current: number, total: number) => void,
  onComplete: () => void,
  onError: (error: Error | ImportResult) => void
) {
  let importedCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;
  
  try {
    // Artificial delay to ensure UI transitions are noticeable
    await new Promise(resolve => setTimeout(resolve, 500));
  
    // Check all existing terms first to avoid duplicates
    const existingTermsResponse = await apiRequest("GET", "/api/terms/names");
    const existingTerms = await existingTermsResponse.json();
    const existingTermNames = new Set(existingTerms.map((term: any) => term.name.toLowerCase()));
    
    console.log(`Found ${existingTermNames.size} existing terms`);
    
    // Artificial delay to ensure progress is visible
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Process terms sequentially
    for (const term of terms) {
      try {
        // Add a small delay between terms to make progress visible
        await new Promise(resolve => setTimeout(resolve, 25));
        
        // Skip terms that already exist
        if (existingTermNames.has(term.name.toLowerCase())) {
          duplicateCount++;
          // Still update progress even for skipped items
          onProgress(++importedCount, terms.length);
          continue;
        }
        
        // Convert to CreateTermInput format
        const termInput: CreateTermInput = {
          name: term.name,
          definition: term.definition,
          isLegacy: term.isLegacy,
          currentTermId: term.currentTermId,
          categories: term.categories
        };
        
        // Create term via API
        await apiRequest("POST", "/api/terms", termInput);
        
        // Add to existing terms set to prevent future duplicates in this same import
        existingTermNames.add(term.name.toLowerCase());
        
        // Update progress
        importedCount++;
        onProgress(importedCount, terms.length);
      } catch (err) {
        errorCount++;
        console.error(`Error importing term ${term.name}:`, err);
        
        // Don't stop the import on individual errors
        // But stop if we have too many errors
        if (errorCount > 10) {
          // Stop the import if we have too many errors, but do it in a controlled way
          // that still shows the error message dialog
          break;
        }
      }
    }
    
    // Final delay to ensure the results are visible
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Invalidate queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["/api/terms"] });
    queryClient.invalidateQueries({ queryKey: ["/api/terms/names"] });
    queryClient.invalidateQueries({ queryKey: ["/api/terms/by-category"] });
    
    // Always provide a completion message with details
    const details = [];
    const successCount = importedCount - duplicateCount - errorCount;
    
    // Format for better readability in dialogs
    if (successCount > 0) {
      details.push(`✅ ${successCount} terms imported successfully`);
    }
    
    if (duplicateCount > 0) {
      details.push(`⚠️ ${duplicateCount} duplicates skipped`);
    }
    
    if (errorCount > 0) {
      details.push(`❌ ${errorCount} errors`);
    }
    
    // Create a message with line breaks for better readability in dialogs
    let message = details.join("\n");
    
    // Add a summary at the end
    message += `\n\nSummary: ${successCount} imported, ${duplicateCount} duplicates, ${errorCount} errors`;
    
    // Determine if this should be treated as an error message or success
    // Treat duplicates as errors too for the UI to show the continue button 
    let isError = false;
    if (errorCount > 0) {
      message = "Import completed with errors:\n\n" + message;
      isError = true;
    } else if (duplicateCount > 0) {
      // Always treat duplicates as errors to show the continue button
      if (duplicateCount > 0 && successCount === 0) {
        message = "⚠️ IMPORT RESULTS: NO NEW TERMS ADDED ⚠️\n\n" + 
                 "All terms already exist in the database.\n\n" + message;
      } else {
        message = "⚠️ IMPORT RESULTS: SOME DUPLICATES SKIPPED ⚠️\n\n" + 
                 "Some terms already exist in the database.\n\n" + message;
      }
      isError = true;
    } else {
      message = "✅ IMPORT COMPLETED SUCCESSFULLY ✅\n\n" + message;
      isError = false;
    }
    
    // Use the onError callback with the message, but it's not necessarily an error
    let errorMessage;
    
    if (details.length > 0) {
      errorMessage = {
        message: message,
        isError: isError
      };
      onError(errorMessage as any);
    } else {
      // If nothing happened, still show a message
      errorMessage = {
        message: "No terms were imported. All terms might already exist in the database.",
        isError: true
      };
      onError(errorMessage as any);
    }
    
    // Show toast only for real errors, not just duplicates
    if (errorCount > 0) {
      // Don't call toast directly here as it needs to be in a component render context
      console.error("IMPORT ERROR: " + message);
    }
  } catch (err) {
    console.error("Import failed with error:", err);
    onError({
      message: `Import failed with error: ${(err as Error).message || 'Unknown error'}`,
      isError: true
    } as any);
  }
}