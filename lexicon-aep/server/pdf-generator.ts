import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';
import { storage } from './storage';
import { db } from './db';
import { sql } from 'drizzle-orm';
import axios from 'axios';

// Process HTML for PDF output preserving some formatting while fixing special characters
// Main function to process HTML content for PDF, preserving formatting details
export function processHtmlForPdf(html: string): { text: string, styles: { highlighted: string[], codeBlocks: {text: string, position: number}[] } } {
  if (!html) return { text: '', styles: { highlighted: [], codeBlocks: [] } };
  
  // First replace HTML entities with their actual characters
  const entities: Record<string, string> = {
    '&nbsp;': ' ',
    '&lt;': '<',
    '&gt;': '>',
    '&amp;': '&',
    '&quot;': '"',
    '&apos;': "'",
    '&ndash;': '-',
    '&mdash;': '-',
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&bull;': '•',
    '&hellip;': '...',
    '&copy;': '(c)',
    '&reg;': '(r)',
    '&trade;': '(tm)',
    '&Oslash;': 'O',
    '&oslash;': 'o',
    '&Aring;': 'A',
    '&aring;': 'a'
  };
  
  let processedHtml = html;
  
  // Replace HTML entities
  Object.entries(entities).forEach(([entity, char]) => {
    processedHtml = processedHtml.replace(new RegExp(entity, 'g'), char);
  });
  
  // Extract code blocks first (pre and code elements, or monospace font styles)
  const codeBlocks: {text: string, position: number}[] = [];
  const codeBlockPlaceholders: {placeholder: string, content: string, position: number}[] = [];
  let codeBlockCounter = 0;
  
  // Match pre tags, code tags, and any spans with monospace or code-related attributes
  const codeBlockRegexes = [
    /<pre[^>]*>([\s\S]*?)<\/pre>/gi,
    /<code[^>]*>([\s\S]*?)<\/code>/gi,
    /<span[^>]*style="[^"]*font-family:\s*monospace[^"]*"[^>]*>([\s\S]*?)<\/span>/gi,
    /<span[^>]*class="[^"]*code[^"]*"[^>]*>([\s\S]*?)<\/span>/gi
  ];
  
  // Process each regex pattern 
  for (const regex of codeBlockRegexes) {
    let match;
    let tempHtml = processedHtml;
    
    // Reset regex state for each pattern
    regex.lastIndex = 0;
    
    while ((match = regex.exec(tempHtml)) !== null) {
      const fullMatch = match[0];
      const codeContent = match[1]
        .replace(/<[^>]*>/g, '') // Remove any nested HTML tags
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
        
      const placeholder = `__CODE_BLOCK_${codeBlockCounter}__`;
      
      // Store position info for later replacement
      const position = match.index;
      codeBlocks.push({ text: codeContent, position });
      codeBlockPlaceholders.push({ 
        placeholder, 
        content: codeContent,
        position
      });
      
      // Replace with placeholder
      processedHtml = processedHtml.replace(fullMatch, placeholder);
      codeBlockCounter++;
      
      // Update the temp HTML to avoid double matching
      tempHtml = tempHtml.replace(fullMatch, ' '.repeat(fullMatch.length));
    }
  }
  
  // Extract highlighted/styled text before stripping HTML
  // Look for spans with background/color styling which are likely highlighted terms
  const highlightedTerms: string[] = [];
  const highlightRegex = /<span[^>]*style="[^"]*(?:background|color)[^"]*"[^>]*>([^<]+)<\/span>/gi;
  let match;
  
  while ((match = highlightRegex.exec(processedHtml)) !== null) {
    highlightedTerms.push(match[1]);
  }
  
  // Also extract parts highlighted with the "sandwich" class commonly used in Adobe terms
  const sandwichRegex = /<span[^>]*class="[^"]*sandwich[^"]*"[^>]*>([^<]+)<\/span>/gi;
  while ((match = sandwichRegex.exec(processedHtml)) !== null) {
    highlightedTerms.push(match[1]);
  }
  
  // Also match "the rule sandwich" phrase as it's specifically used in Adobe docs
  const ruleRegex = /the rule sandwich/gi;
  while ((match = ruleRegex.exec(processedHtml)) !== null) {
    highlightedTerms.push(match[0]);
  }
  
  // Process inline code (monospace formatting)
  const inlineCodeRegex = /<(code|tt|kbd|pre)[^>]*>([^<]+)<\/\1>/gi;
  while ((match = inlineCodeRegex.exec(processedHtml)) !== null) {
    const codeText = match[2];
    codeBlocks.push({ text: codeText, position: match.index });
  }
  
  // Strip HTML tags
  let result = processedHtml
    .replace(/<\/?[^>]+(>|$)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  // Comprehensive processing of problematic special characters and sequences
  // Replace each special character with a plain text equivalent
  // This is specifically for PDF output which has trouble with certain unicode chars
  result = result
    // Handle specific character combinations that appear in Adobe terminology
    .replace(/Ø=>/g, 'O=>') 
    .replace(/Ø=/g, 'O=')
    .replace(/Ø>/g, 'O>')
    .replace(/Ø-/g, 'O-')
    .replace(/Ø\(/g, 'O(')
    .replace(/\)Ø/g, ')O')
    .replace(/Ø</g, 'O<')
    .replace(/Ø\./g, 'O.')
    .replace(/Ø,/g, 'O,')
    .replace(/Ø:/g, 'O:')
    .replace(/Ø;/g, 'O;')
    .replace(/ØY/g, 'O-Y')
    .replace(/Ø\+/g, 'O+')
    .replace(/Ø\*/g, 'O*')
    .replace(/\sØ\s/g, ' O ')
    .replace(/Ø([A-Z])/g, 'O-$1') // Ø followed by uppercase letter
    .replace(/Ø([a-z])/g, 'O-$1') // Ø followed by lowercase letter
    
    // Replace numeric sequences
    .replace(/0\./g, '0.')
    .replace(/\.0/g, '.0')
    .replace(/\d+Ø/g, (match) => match.replace('Ø', 'O'))
    .replace(/Ø\d+/g, (match) => match.replace('Ø', 'O'))
    
    // Complete replacement of problematic characters
    .replace(/Ø/g, 'O')
    .replace(/ø/g, 'o')
    .replace(/Å/g, 'A')
    .replace(/å/g, 'a')
    .replace(/æ/g, 'ae')
    .replace(/Æ/g, 'AE')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'OE')
    
    // Extra spacing around specific punctuation
    .replace(/([<>+:;])/g, ' $1 ') 
    .replace(/\s+/g, ' ');
  
  // Restore code blocks in cleaned text
  for (const block of codeBlockPlaceholders) {
    result = result.replace(block.placeholder, `\n\n${block.content}\n\n`);
  }
  
  // Clean up common phrase formatting: "send it downstream"
  result = result.replace(/Send it downstream/gi, 'Send it downstream');
  
  // Clean up the rule sandwich terminology
  result = result.replace(/the rule sandwich/gi, 'the rule sandwich');
  
  return { 
    text: result, 
    styles: { 
      highlighted: highlightedTerms.filter(Boolean),
      codeBlocks: codeBlocks
    } 
  };
}

/**
 * Generate a PDF version of the glossary with terms in alphabetical order
 */
export async function generateGlossaryPdf(outputPath: string): Promise<string> {
  try {
    // Get all terms
    const terms = await storage.searchTerms('');
    console.log(`Generating PDF with ${terms.length} terms`);
    
    // Sort terms alphabetically by name
    terms.sort((a, b) => a.name.localeCompare(b.name));
    
    // Create a new PDF document
    const doc = new PDFDocument({
      size: 'A4',
      margins: {
        top: 50,
        bottom: 50,
        left: 72,
        right: 72
      },
      bufferPages: true
    });
    
    // Create a write stream to save the PDF
    const outputFilePath = path.resolve(outputPath);
    const stream = fs.createWriteStream(outputFilePath);
    doc.pipe(stream);
    
    // Format the date as "14th January 2025"
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    
    // Add suffix to day number (1st, 2nd, 3rd, etc.)
    const getDaySuffix = (day: number): string => {
      if (day > 3 && day < 21) return 'th';
      switch (day % 10) {
        case 1: return 'st';
        case 2: return 'nd';
        case 3: return 'rd';
        default: return 'th';
      }
    };
    
    const formattedDate = `${day}${getDaySuffix(day)} ${month} ${year}`;
    
    // Add a stylish cover page based on the provided design
    // Draw colored diagonal borders
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    const coverSize = Math.min(pageWidth, pageHeight) * 0.65; // Size of the white octagon area
    
    // Draw colored triangles for the border
    // Top-left (red)
    doc.fillColor('#E53935')
       .moveTo(0, 0)
       .lineTo(centerX - coverSize/2, centerY - coverSize/2)
       .lineTo(0, pageHeight/3)
       .fill();
    
    // Top (orange)
    doc.fillColor('#F57C00')
       .moveTo(0, 0)
       .lineTo(pageWidth, 0)
       .lineTo(centerX + coverSize/2, centerY - coverSize/2)
       .lineTo(centerX - coverSize/2, centerY - coverSize/2)
       .fill();
    
    // Top-right (pink)
    doc.fillColor('#D81B60')
       .moveTo(pageWidth, 0)
       .lineTo(pageWidth, pageHeight/3)
       .lineTo(centerX + coverSize/2, centerY - coverSize/2)
       .fill();
    
    // Right (crimson)
    doc.fillColor('#C2185B')
       .moveTo(pageWidth, pageHeight/3)
       .lineTo(pageWidth, pageHeight * 2/3)
       .lineTo(centerX + coverSize/2, centerY + coverSize/2)
       .lineTo(centerX + coverSize/2, centerY - coverSize/2)
       .fill();
    
    // Bottom-right (red)
    doc.fillColor('#D32F2F')
       .moveTo(pageWidth, pageHeight)
       .lineTo(pageWidth, pageHeight * 2/3)
       .lineTo(centerX + coverSize/2, centerY + coverSize/2)
       .fill();
    
    // Bottom (purple)
    doc.fillColor('#8E24AA')
       .moveTo(0, pageHeight)
       .lineTo(pageWidth, pageHeight)
       .lineTo(centerX + coverSize/2, centerY + coverSize/2)
       .lineTo(centerX - coverSize/2, centerY + coverSize/2)
       .fill();
    
    // Bottom-left (purple)
    doc.fillColor('#6A1B9A')
       .moveTo(0, pageHeight)
       .lineTo(0, pageHeight * 2/3)
       .lineTo(centerX - coverSize/2, centerY + coverSize/2)
       .fill();
    
    // Left (dark red)
    doc.fillColor('#B71C1C')
       .moveTo(0, pageHeight/3)
       .lineTo(0, pageHeight * 2/3)
       .lineTo(centerX - coverSize/2, centerY + coverSize/2)
       .lineTo(centerX - coverSize/2, centerY - coverSize/2)
       .fill();
    
    // Create white octagon for text
    doc.fillColor('white')
       .moveTo(centerX - coverSize/2, centerY - coverSize/2)
       .lineTo(centerX + coverSize/2, centerY - coverSize/2)
       .lineTo(centerX + coverSize/2, centerY + coverSize/2)
       .lineTo(centerX - coverSize/2, centerY + coverSize/2)
       .fill();
    
    // Add the title text in purple
    const titleY = centerY - coverSize/4;
    doc.fillColor('#4A148C')
       .fontSize(60)
       .font('Helvetica-Bold')
       .text('AEP', centerX, titleY, { align: 'center' });
    
    doc.fillColor('#4A148C')
       .fontSize(40)
       .font('Helvetica-Bold')
       .text('Lexicon', centerX, titleY + 65, { align: 'center' });
    
    // Add author's name at the bottom of the white area
    doc.fillColor('black')
       .fontSize(20)
       .font('Helvetica-Bold')
       .text('Barry Mann', centerX, centerY + coverSize/3, { align: 'center' });
    
    // Add generated date at the very bottom of the page
    doc.fontSize(10)
       .fillColor('white')
       .text(`Generated on ${formattedDate}`, centerX, pageHeight - 30, { align: 'center' });
    
    doc.addPage();
    
    // Add simple table of contents title
    doc.fontSize(20).text('Table of Contents', { align: 'center' });
    doc.moveDown();
    
    // Get unique first letters
    const letterSet = new Set<string>();
    terms.forEach(term => letterSet.add(term.name.charAt(0).toUpperCase()));
    const uniqueFirstLetters = Array.from(letterSet).sort();

    // Create a page reference placeholder object
    // We'll need to collect actual page numbers during content generation
    const letterPageRefs: Record<string, number> = {};
    
    // Save the TOC page for later reference
    const tocPage = doc.bufferedPageRange().start + 1;
    
    // Reserve space for TOC entries
    doc.fontSize(12);
    doc.text("Letter Sections:", { underline: true });
    doc.moveDown(0.5);
    
    for (const letter of uniqueFirstLetters) {
      // Reserve space in TOC for each letter with dots and page placeholder
      doc.text(`${letter} ....................... pg. [TBD]`, { 
        continued: false,
        align: 'left'
      });
    }
    
    doc.moveDown(2);
    
    // Add term listing
    doc.addPage();
    
    // Group terms by first letter
    const termsByLetter: Record<string, typeof terms> = {};
    for (const term of terms) {
      const firstLetter = term.name.charAt(0).toUpperCase();
      if (!termsByLetter[firstLetter]) {
        termsByLetter[firstLetter] = [];
      }
      termsByLetter[firstLetter].push(term);
    }
    
    // Fetch all terms with images for quicker lookup
    const { rows: termsWithImagesRows } = await db.execute(sql`
      SELECT 
        t.id,
        t.name,
        t.slug,
        json_agg(
          json_build_object(
            'id', ti.id,
            'filename', ti.filename,
            'firebase_url', ti.firebase_url
          )
        ) AS images
      FROM terms t
      JOIN term_images ti ON t.id = ti.term_id
      GROUP BY t.id, t.name, t.slug
    `);
    
    // Create a lookup map for terms with images
    interface TermImageRow {
      id: number;
      name: string;
      slug: string;
      images: Array<{
        id: number;
        filename: string;
        firebase_url: string;
      }>;
    }
    
    const termImagesMap = new Map<number, any>();
    termsWithImagesRows.forEach((row: any) => {
      if (row && typeof row.id === 'number') {
        termImagesMap.set(row.id, row.images);
      }
    });
    
    // Process each letter group - no page breaks between letters unless needed
    let isFirstLetter = true;
    
    for (const letter of uniqueFirstLetters) {
      // Only add page break if not the first letter and there's content on the page
      if (!isFirstLetter && doc.y > 700) {
        doc.addPage();
      } else if (!isFirstLetter) {
        doc.moveDown(2);
      }
      
      isFirstLetter = false;
      
      // Store the current page number for this letter section
      letterPageRefs[letter] = doc.bufferedPageRange().start + 1;
      
      // Add letter header
      doc.fontSize(24)
        .fillColor('#0066CC')
        .text(letter, { align: 'center' })
        .moveDown()
        .fillColor('black');
      
      // Add terms for this letter
      const termsForLetter = termsByLetter[letter];
      
      // Process all terms for this letter
      for (const term of termsForLetter) {
        // Get the full term with metadata
        const termWithMetadata = await storage.getTermWithMetadata(term.id);
        
        // Check if we need a page break based on remaining space
        if (doc.y > 700) {
          doc.addPage();
        }
        
        // Process term name to replace problematic characters for PDF rendering
        let processedTermName = term.name;
        
        // Apply the same character replacements to term names
        processedTermName = processedTermName
          .replace(/Ø/g, 'O')
          .replace(/ø/g, 'o')
          .replace(/Å/g, 'A')
          .replace(/å/g, 'a')
          .replace(/æ/g, 'ae')
          .replace(/Æ/g, 'AE')
          .replace(/œ/g, 'oe')
          .replace(/Œ/g, 'OE');
        
        // Check if the term name contains a special term like "Sandwich" or "Rule Sandwich"
        const specialTerms = ['sandwich', 'rule sandwich'];
        const hasSpecialTerm = specialTerms.some(special => 
          processedTermName.toLowerCase().includes(special));
        
        // If this is a special term with "sandwich" in it, highlight the sandwich part
        if (hasSpecialTerm) {
          // Find the position of "sandwich" or "rule sandwich" in the name (case insensitive)
          const fullName = processedTermName;
          
          // Prepare to highlight the term
          doc.fontSize(16).font('Helvetica-Bold');
          
          if (fullName.toLowerCase().includes('rule sandwich')) {
            // Handle "Rule Sandwich" special case
            const parts = fullName.split(/rule sandwich/i);
            const beforeText = parts[0];
            const afterText = parts.length > 1 ? parts[1] : '';
            
            // Get position for text
            const startX = doc.x;
            const startY = doc.y;
            
            // Get width of the parts
            const beforeWidth = doc.widthOfString(beforeText);
            const highlightWidth = doc.widthOfString('Rule Sandwich');
            
            // Draw the parts
            doc.fillColor('#000000').text(beforeText, { continued: true });
            
            // Save positions for the highlight
            const highlightX = startX + beforeWidth;
            const highlightY = startY;
            
            // Draw yellow background for "Rule Sandwich"
            doc.fillColor('#FFEB3B')
              .rect(highlightX - 2, highlightY - 2, highlightWidth + 4, 22)
              .fill();
              
            // Add the highlighted text
            doc.fillColor('#000000')
              .text('Rule Sandwich', highlightX, highlightY, { continued: afterText.length > 0 });
              
            // Add any remaining text after the highlight
            if (afterText.length > 0) {
              doc.text(afterText);
            } else {
              doc.moveDown(0.5);
            }
          } else if (fullName.toLowerCase().includes('sandwich')) {
            // Handle "Sandwich" in general
            const parts = fullName.split(/sandwich/i);
            const beforeText = parts[0];
            const afterText = parts.length > 1 ? parts[1] : '';
            
            // Get position for text
            const startX = doc.x;
            const startY = doc.y;
            
            // Get width of the parts
            const beforeWidth = doc.widthOfString(beforeText);
            const highlightWidth = doc.widthOfString('Sandwich');
            
            // Draw the parts
            doc.fillColor('#000000').text(beforeText, { continued: true });
            
            // Save positions for the highlight
            const highlightX = startX + beforeWidth;
            const highlightY = startY;
            
            // Draw yellow background for "Sandwich"
            doc.fillColor('#FFEB3B')
              .rect(highlightX - 2, highlightY - 2, highlightWidth + 4, 22)
              .fill();
              
            // Add the highlighted text
            doc.fillColor('#000000')
              .text('Sandwich', highlightX, highlightY, { continued: afterText.length > 0 });
              
            // Add any remaining text after the highlight
            if (afterText.length > 0) {
              doc.text(afterText);
            } else {
              doc.moveDown(0.5);
            }
          }
        } else {
          // For normal terms without special highlighting
          doc.fontSize(16)
            .fillColor('#000000')
            .font('Helvetica-Bold')
            .text(processedTermName, { 
              characterSpacing: 0.5,
              lineGap: 2
            })
            .moveDown(0.5);
        }
        
        // Process definition with highlighted text preservation
        const processedDefinition = processHtmlForPdf(termWithMetadata.definition || 'No definition provided.');
        const { text: definition, styles } = processedDefinition;
        
        // Maintain a record of where highlighted terms appear in the text for rendering
        // Match the exact text in the processed definition
        const highlightPositions: Array<{ start: number, end: number, text: string }> = [];
        
        // Track code blocks for special formatting with monospace font
        const codeBlockPositions: Array<{ text: string, position: number }> = styles.codeBlocks || [];
        
        // Get highlight positions for all highlighted terms
        if (styles.highlighted.length > 0) {
          console.log(`Found highlighted terms in "${term.name}": ${styles.highlighted.join(', ')}`);
          
          styles.highlighted.forEach(highlightedTerm => {
            // Find all instances of the highlighted term in the definition
            let index = definition.toLowerCase().indexOf(highlightedTerm.toLowerCase());
            while (index !== -1) {
              const end = index + highlightedTerm.length;
              highlightPositions.push({
                start: index,
                end,
                text: definition.substring(index, end)
              });
              index = definition.toLowerCase().indexOf(highlightedTerm.toLowerCase(), end);
            }
          });
        }
        
        // If we have highlighted terms, we need to render the definition in segments
        if (highlightPositions.length > 0) {
          // Sort positions by start index
          highlightPositions.sort((a, b) => a.start - b.start);
          
          // Combine overlapping highlights
          const mergedPositions: Array<{ start: number, end: number, text: string }> = [];
          let currentPos = highlightPositions[0];
          
          for (let i = 1; i < highlightPositions.length; i++) {
            const nextPos = highlightPositions[i];
            if (nextPos.start <= currentPos.end) {
              // Overlapping highlights - merge them
              currentPos.end = Math.max(currentPos.end, nextPos.end);
              currentPos.text = definition.substring(currentPos.start, currentPos.end);
            } else {
              // Non-overlapping - add current to result and move on
              mergedPositions.push(currentPos);
              currentPos = nextPos;
            }
          }
          mergedPositions.push(currentPos);
          
          // Render the definition with highlighted sections
          let lastEnd = 0;
          
          for (const pos of mergedPositions) {
            // Add non-highlighted text before this highlight
            if (pos.start > lastEnd) {
              const nonHighlightedText = definition.substring(lastEnd, pos.start);
              doc.fontSize(12)
                .font('Helvetica')
                .fillColor('#000000')
                .text(nonHighlightedText, {
                  continued: true,
                  lineGap: 2
                });
            }
            
            // Add highlighted text with special styling - use yellow background
            // First draw a yellow rectangle for highlighting
            const textHeight = doc.heightOfString(pos.text, {
              width: doc.page.width - 144, // Page width minus margins
              lineGap: 2
            });
            
            // Save current position
            const currentX = doc.x;
            const currentY = doc.y;
            
            // Draw yellow highlight background
            doc.fillColor('#FFEB3B') // Yellow background
               .rect(currentX - 2, currentY - 2, 
                    doc.widthOfString(pos.text) + 4, textHeight + 4)
               .fill();
            
            // Add the actual text in black on top of the highlight
            doc.fillColor('#000000') // Black text
               .font('Helvetica-Bold')
               .text(pos.text, currentX, currentY, {
                 continued: pos.end < definition.length,
                 lineGap: 2
               });
            
            lastEnd = pos.end;
          }
          
          // Add any remaining non-highlighted text
          if (lastEnd < definition.length) {
            const remainingText = definition.substring(lastEnd);
            doc.fontSize(12)
              .font('Helvetica')
              .fillColor('#000000')
              .text(remainingText, {
                lineGap: 2
              });
          }
          
          doc.moveDown();
        } else if (codeBlockPositions.length > 0) {
          // We have code blocks that need special formatting with monospace font
          // Find code blocks in the text
          const codeRegex = /`([^`]+)`|\n\n([A-Za-z0-9\s\.:;<>{}()\[\]"'\/\\|!@#$%^&*=+-_]+)\n\n/g;
          let match;
          let lastIndex = 0;
          
          // Create segments of regular text and code blocks
          const segments: Array<{
            type: 'text' | 'code',
            content: string
          }> = [];
          
          // Process the text and identify code blocks by pattern
          while ((match = codeRegex.exec(definition)) !== null) {
            // Add text before this code block
            if (match.index > lastIndex) {
              segments.push({
                type: 'text',
                content: definition.substring(lastIndex, match.index)
              });
            }
            
            // Add the code block itself
            segments.push({
              type: 'code',
              content: match[1] || match[2] // Either inline code or block code
            });
            
            lastIndex = match.index + match[0].length;
          }
          
          // Add any remaining text after the last code block
          if (lastIndex < definition.length) {
            segments.push({
              type: 'text',
              content: definition.substring(lastIndex)
            });
          }
          
          // If no segments were created because the regex didn't match, just add the whole text
          if (segments.length === 0) {
            segments.push({
              type: 'text',
              content: definition
            });
          }
          
          // Render each segment with appropriate formatting
          for (const segment of segments) {
            if (segment.type === 'code') {
              // Add some padding before code blocks
              doc.moveDown(0.5);
              
              // Draw a light gray background for code blocks
              const codeHeight = doc.heightOfString(segment.content, {
                width: doc.page.width - 144 - 20, // Page width minus margins and extra padding
                lineGap: 2
              });
              
              const codeX = doc.x;
              const codeY = doc.y;
              
              // Gray background
              doc.fillColor('#f5f5f5')
                 .rect(codeX - 5, codeY - 5, doc.page.width - 144 - 10, codeHeight + 10)
                 .fill();
              
              // Code text in monospace font
              doc.font('Courier')
                 .fontSize(11)
                 .fillColor('#333333')
                 .text(segment.content, codeX, codeY, {
                   paragraphGap: 2,
                   lineGap: 2,
                   width: doc.page.width - 144 - 20,
                   align: 'left'
                 });
                 
              // Add padding after code blocks  
              doc.moveDown(0.5);
              
              // Reset to regular font
              doc.font('Helvetica').fontSize(12);
            } else {
              // Regular text
              doc.font('Helvetica')
                 .fontSize(12)
                 .fillColor('#000000')
                 .text(segment.content, {
                   wordSpacing: 0.5,
                   paragraphGap: 5,
                   lineGap: 2,
                   align: 'left'
                 });
            }
          }
          
          doc.moveDown();
        } else {
          // No highlighted terms or code blocks, render normally
          doc.fontSize(12)
            .font('Helvetica')
            .fillColor('#000000')
            .text(definition, {
              wordSpacing: 0.5,
              paragraphGap: 5,
              lineGap: 2,
              align: 'left'
            })
            .moveDown();
        }
        
        // Check if the term has images and add the first image if it exists
        const termImages = termImagesMap.get(term.id);
        if (termImages && termImages.length > 0) {
          try {
            // Only add the first image for space considerations
            const firstImage = termImages[0];
            if (firstImage && firstImage.firebase_url) {
              const imageUrl = firstImage.firebase_url;
              console.log(`Adding image for term ${term.name}: ${imageUrl}`);
              
              // Add a note about the image
              doc.fontSize(10)
                .fillColor('#666666')
                .text('Image:')
                .moveDown(0.5);
              
              // Embed the image with appropriate sizing
              try {
                // Download the image first, then embed it in the PDF
                try {
                  // Create a temporary directory for downloaded images if it doesn't exist
                  const tempDir = path.join(process.cwd(), 'tmp');
                  if (!fs.existsSync(tempDir)) {
                    fs.mkdirSync(tempDir, { recursive: true });
                  }
                  
                  // Download the image to a temporary file
                  const tempFilePath = path.join(tempDir, `temp-image-${term.id}.png`);
                  
                  // Check if the URL is for a webp image (not supported by PDFKit)
                  if (imageUrl.toLowerCase().includes('.webp')) {
                    throw new Error('WebP format not supported in PDF');
                  }
                  
                  // Download the image using axios with a timeout
                  const response = await axios({
                    method: 'get',
                    url: imageUrl,
                    responseType: 'arraybuffer',
                    timeout: 5000 // 5 second timeout to prevent hanging
                  });
                  
                  // Save the image to a temporary file
                  fs.writeFileSync(tempFilePath, response.data);
                  
                  // Add the downloaded image to the PDF
                  doc.image(tempFilePath, { 
                    width: 250, // Limit the image width to fit the page
                    align: 'center'
                  }).moveDown(1);
                  
                  // Delete the temporary file after using it
                  fs.unlinkSync(tempFilePath);
                } catch (imgErr) {
                  // If the image can't be downloaded or embedded, show a note with the filename
                  console.error(`Error downloading/embedding image for term ${term.name}:`, imgErr);
                  doc.fontSize(9)
                    .fillColor('#999999')
                    .text(`[Image available online: ${firstImage.filename}]`)
                    .moveDown(1);
                }
              } catch (imgErr) {
                console.error(`Error processing image for term ${term.name}:`, imgErr);
                doc.text(`[Image could not be loaded: ${firstImage.filename}]`);
              }
            }
          } catch (imageErr) {
            console.error(`Error processing images for term ${term.name}:`, imageErr);
          }
        }
        
        // Add categories
        if (termWithMetadata.categories && termWithMetadata.categories.length > 0) {
          doc.fontSize(10)
            .fillColor('#666666')
            .text('Categories: ' + termWithMetadata.categories.map((c: any) => c.name).join(', '))
            .moveDown(2);
        } else {
          doc.moveDown(2);
        }
      }
    }
    
    // Now that we have collected page numbers for all letters,
    // go back and update the table of contents
    doc.switchToPage(tocPage - 1); // Page indexing starts at 0
    
    // Reset position to where we expect to start the TOC entries
    const tocStartY = 170; // Adjust this value based on your specific layout
    doc.y = tocStartY;
    
    // Clear existing TOC content by covering it with a white rectangle
    doc.fillColor('white')
       .rect(72, tocStartY, doc.page.width - 144, doc.page.height - tocStartY - 100)
       .fill();
    
    // Add updated TOC header
    doc.fillColor('black')
       .fontSize(12)
       .text("Letter Sections:", { underline: true });
    doc.moveDown(0.5);
    
    // Add actual TOC entries with real page numbers
    for (const letter of uniqueFirstLetters) {
      const pageNum = letterPageRefs[letter];
      
      // Draw dots between the letter and page number
      const letterWidth = doc.widthOfString(`${letter} `);
      const pageNumWidth = doc.widthOfString(` ${pageNum}`);
      const maxWidth = doc.page.width - 144; // Page width minus margins
      const dotsWidth = maxWidth - letterWidth - pageNumWidth;
      
      let dots = '';
      const singleDotWidth = doc.widthOfString('.');
      const numberOfDots = Math.floor(dotsWidth / singleDotWidth);
      for (let i = 0; i < numberOfDots; i++) {
        dots += '.';
      }
      
      // Write the TOC entry with dots
      doc.text(`${letter} ${dots} ${pageNum}`, { 
        continued: false,
        align: 'left'
      });
    }
    
    // Add page numbers
    const pageCount = doc.bufferedPageRange().count;
    for (let i = 0; i < pageCount; i++) {
      doc.switchToPage(i);
      
      // Skip page number on title page
      if (i > 0) {
        doc.fontSize(10)
          .fillColor('#666666')
          .text(
            `Page ${i + 1} of ${pageCount}`, 
            72, 
            doc.page.height - 50,
            { align: 'center' }
          );
      }
    }
    
    // Finalize the PDF
    doc.end();
    
    return new Promise((resolve, reject) => {
      stream.on('finish', () => {
        console.log(`PDF generated successfully at ${outputFilePath}`);
        resolve(outputFilePath);
      });
      
      stream.on('error', (err) => {
        console.error('Error generating PDF:', err);
        reject(err);
      });
    });
  } catch (error) {
    console.error('Error generating glossary PDF:', error);
    throw error;
  }
}