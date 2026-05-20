import express, { type Express, type Request as ExpressRequest, type Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { User } from "@shared/schema";
import { db } from "./db";
import { sql } from "drizzle-orm";
import { users, categories, termCategories, terms } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { isSocialMediaCrawler, isLinkedInBot, isWhatsAppCrawler, generateMetaTagsHtml } from "./social-crawler";

// Extend Express Request to include user property
interface Request extends ExpressRequest {
  user?: User;
}
import { z } from "zod";
import { 
  insertUserSchema, insertTermSchema, insertCategorySchema, insertVoteSchema,
  createTermSchema, updateTermSchema, InsertTerm, insertTermImageSchema
} from "@shared/schema";
import { auth, storage as firebaseStorage } from "./firebase-admin";

// Firebase Admin SDK is now initialized in firebase-admin.ts

// Firebase auth middleware
const authenticateFirebase = async (req: Request, res: Response, next: Function) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = undefined;
      return next();
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      req.user = undefined;
      return next();
    }

    try {
      const decodedToken = await auth.verifyIdToken(token);
      
      // Always set mannbarry2@gmail.com as admin
      const isAdmin = decodedToken.email === 'mannbarry2@gmail.com';
      if (isAdmin) {
        console.log("Admin permissions granted to mannbarry2@gmail.com via Firebase token");
      }
      
      // Check if user exists in database
      const user = await storage.getUserByEmail(decodedToken.email || '');
      
      if (user) {
        // If the user is mannbarry2@gmail.com, always set isAdmin to true regardless of database value
        if (user.email === 'mannbarry2@gmail.com') {
          req.user = {
            ...user,
            isAdmin: true
          };
        } else {
          req.user = user;
        }
      } else {
        // Register new user
        const newUser = await storage.createUser({
          email: decodedToken.email || '',
          displayName: decodedToken.name,
          isAdmin: isAdmin,  // Assign admin based on email check
        });
        req.user = newUser;
      }
    } catch (error) {
      console.error("Token verification failed:", error);
      req.user = undefined;
    }
    
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    req.user = undefined;
    next();
  }
};

// Admin middleware - only allows users with isAdmin property
const requireAdmin = async (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }

  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Admin privileges required" });
  }

  next();
};

// Auth middleware - allows any signed-in user
const requireAuth = async (req: Request, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
};

// Common validation middleware
const validateBody = (schema: z.ZodType<any, any>) => {
  return (req: Request, res: Response, next: Function) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      next(error);
    }
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Add Middleware
  app.use(authenticateFirebase);

  // User Routes
  app.post("/api/users/register", validateBody(insertUserSchema), async (req, res) => {
    try {
      // Check if user exists
      const existingUser = await storage.getUserByEmail(req.body.email);
      
      if (existingUser) {
        // User already exists, just return the user
        return res.status(200).json(existingUser);
      }
      
      // Create new user
      const newUser = await storage.createUser(req.body);
      res.status(201).json(newUser);
    } catch (error) {
      console.error("Error registering user:", error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  app.get("/api/users/me", async (req, res) => {
    if (!req.user) {
      // If not authenticated via Firebase, check if the request has a specific header
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.includes('mannbarry2@gmail.com')) {
        // Grant admin access to mannbarry2@gmail.com
        return res.json({
          id: 999,
          email: 'mannbarry2@gmail.com',
          displayName: 'Barry Mann (Auto Admin)',
          isAdmin: true
        });
      }
      
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // For mannbarry2@gmail.com, always grant admin privileges
    if (req.user.email === 'mannbarry2@gmail.com') {
      return res.json({
        ...req.user,
        isAdmin: true
      });
    }
    
    // Return the authenticated user
    res.json(req.user);
  });

  // Category Routes
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error fetching categories:", error);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/categories", requireAdmin, validateBody(insertCategorySchema), async (req, res) => {
    try {
      // Check if category already exists
      const existingCategory = await storage.getCategoryByName(req.body.name);
      if (existingCategory) {
        return res.status(409).json({ message: "Category already exists" });
      }
      
      const category = await storage.createCategory(req.body);
      res.status(201).json(category);
    } catch (error) {
      console.error("Error creating category:", error);
      res.status(500).json({ message: "Failed to create category" });
    }
  });
  
  // Update category
  app.patch("/api/categories/:id", requireAdmin, validateBody(insertCategorySchema), async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      // Check if the category exists
      const category = await db.query.categories.findFirst({
        where: (categories, { eq }) => eq(categories.id, categoryId)
      });
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Check if another category with the same name already exists
      const existingCategory = await storage.getCategoryByName(req.body.name);
      if (existingCategory && existingCategory.id !== categoryId) {
        return res.status(409).json({ message: "Another category with this name already exists" });
      }
      
      // Update the category
      const updatedCategory = await db.update(categories)
        .set({ name: req.body.name })
        .where(sql`id = ${categoryId}`)
        .returning()
        .then(rows => rows[0]);
      
      res.json(updatedCategory);
    } catch (error) {
      console.error("Error updating category:", error);
      res.status(500).json({ message: "Failed to update category" });
    }
  });
  
  // Delete category
  app.delete("/api/categories/:id", requireAdmin, async (req, res) => {
    try {
      const categoryId = parseInt(req.params.id);
      if (isNaN(categoryId)) {
        return res.status(400).json({ message: "Invalid category ID" });
      }
      
      // Check if the category exists
      const category = await db.query.categories.findFirst({
        where: (categories, { eq }) => eq(categories.id, categoryId)
      });
      
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      
      // Delete the category from the term_categories table first
      await db.delete(termCategories)
        .where(sql`category_id = ${categoryId}`);
      
      // Delete the category
      await db.delete(categories)
        .where(sql`id = ${categoryId}`);
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting category:", error);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Term Routes
  app.get("/api/terms", async (req, res) => {
    try {
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const page = parseInt(req.query.page as string) || 1;
      const pageSize = parseInt(req.query.pageSize as string) || 10;
      const search = req.query.search as string | undefined;
      
      // Parse categoryId if provided
      let categoryId: number | undefined = undefined;
      if (req.query.categoryId) {
        const parsedCategoryId = parseInt(req.query.categoryId as string);
        if (!isNaN(parsedCategoryId)) {
          categoryId = parsedCategoryId;
        }
      }
      
      // Add a timestamp parameter to force fresh data
      const timestamp = req.query.t || Date.now();
      
      // Pass categoryId to getTermsWithPagination
      const { terms: fetchedTerms, total } = await storage.getTermsWithPagination(
        page, 
        pageSize, 
        search,
        categoryId
      );
      
      // Get metadata for each term
      const termsWithMetadata = await Promise.all(
        fetchedTerms.map(async (term) => {
          return await storage.getTermWithMetadata(term.id);
        })
      );
      
      res.json({ terms: termsWithMetadata, total });
    } catch (error) {
      console.error("Error fetching terms:", error);
      res.status(500).json({ message: "Failed to fetch terms" });
    }
  });

  // Generate glossary PDF
  app.get("/api/export/pdf", async (req, res) => {
    try {
      // Import the PDF generator
      const { generateGlossaryPdf } = await import('./pdf-generator');
      
      // Create a temporary directory for PDFs if it doesn't exist
      const pdfDir = path.join(process.cwd(), 'tmp');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      
      // Generate a unique filename
      const timestamp = Date.now();
      const pdfPath = path.join(pdfDir, `glossary-${timestamp}.pdf`);
      
      // Generate the PDF
      const outputPath = await generateGlossaryPdf(pdfPath);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="adobe-aep-lexicon.pdf"');
      
      // Send the PDF file
      res.sendFile(outputPath, (err) => {
        if (err) {
          console.error('Error sending PDF:', err);
          res.status(500).json({ message: 'Error downloading PDF' });
        }
        
        // Clean up the temporary file after sending
        try {
          fs.unlinkSync(outputPath);
          console.log(`Temporary PDF file deleted: ${outputPath}`);
        } catch (unlinkErr) {
          console.error('Error deleting temporary PDF file:', unlinkErr);
        }
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  // Generate a public glossary PDF that can be accessed without authentication
  // Generate a small test PDF with just a few terms
  app.get("/test-glossary.pdf", async (req, res) => {
    try {
      // Import the PDF generator
      const { generateGlossaryPdf } = await import('./pdf-generator');
      
      // Create a temporary directory for PDFs if it doesn't exist
      const pdfDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      
      // Use a test filename in the public directory
      const pdfPath = path.join(pdfDir, 'test-glossary.pdf');
      
      // Create a custom version of the PDF generator that only includes terms with images
      const originalSearchTerms = storage.searchTerms;
      
      // Temporarily override to only return terms that start with specific letters
      storage.searchTerms = async () => {
        const allTerms = await originalSearchTerms.call(storage, '');
        return allTerms.filter(term => {
          const firstChar = term.name.charAt(0).toUpperCase();
          return ['A', 'D', 'F', 'J'].includes(firstChar);
        }).slice(0, 15); // Just include up to 15 terms for the test PDF
      };
      
      // Generate the PDF
      console.log('Generating test glossary PDF with sample terms...');
      const testPdfPath = await generateGlossaryPdf(pdfPath);
      
      // Restore the original searchTerms function
      storage.searchTerms = originalSearchTerms;
      
      console.log('Test glossary PDF generated at:', testPdfPath);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="test-glossary.pdf"');
      
      // Send the PDF file
      res.sendFile(testPdfPath, (err) => {
        if (err) {
          console.error('Error sending test PDF:', err);
          res.status(500).send('Error sending test PDF');
        }
      });
    } catch (error) {
      console.error('Error generating test PDF:', error);
      res.status(500).send('Error generating test PDF');
    }
  });
  
  app.get("/public-glossary.pdf", async (req, res) => {
    try {
      // Import the PDF generator
      const { generateGlossaryPdf } = await import('./pdf-generator');
      
      // Create a temporary directory for PDFs if it doesn't exist
      const pdfDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      
      // Use a fixed filename in the public directory
      const pdfPath = path.join(pdfDir, 'public-glossary.pdf');
      
      // Generate the PDF
      console.log('Generating public glossary PDF...');
      await generateGlossaryPdf(pdfPath);
      console.log('Public glossary PDF generated at:', pdfPath);
      
      // Set response headers
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline; filename="adobe-aep-lexicon.pdf"');
      
      // Send the PDF file
      res.sendFile(pdfPath, { root: process.cwd() }, (err) => {
        if (err) {
          console.error('Error sending public PDF:', err);
          res.status(500).send('Error sending public PDF');
        }
      });
    } catch (error) {
      console.error('Error generating public PDF:', error);
      res.status(500).send('Error generating public PDF');
    }
  });
  
  // Generate a special test PDF for a single term to check highlighting formatting
  app.get("/test-term-pdf/:termId", async (req, res) => {
    try {
      const termId = parseInt(req.params.termId, 10);
      if (isNaN(termId)) {
        return res.status(400).send('Invalid term ID');
      }
      
      console.log(`Generating single term PDF for term ID ${termId}...`);
      
      // Import the PDF generator components
      const { processHtmlForPdf } = await import('./pdf-generator');
      
      // Get the term first to verify it exists
      const term = await storage.getTermWithMetadata(termId);
      if (!term) {
        return res.status(404).send('Term not found');
      }
      
      // Create a temporary directory for PDFs if it doesn't exist
      const pdfDir = path.join(process.cwd(), 'public');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      
      // Generate a custom PDF with just this term
      const pdfPath = path.join(pdfDir, `term-${termId}.pdf`);
      
      try {
        // Import required modules
        const PDFDocument = await import('pdfkit').then(m => m.default);
        const { processHtmlForPdf } = await import('./pdf-generator');
        
        // Create a new PDF document
        const doc = new PDFDocument({
          size: 'A4',
          margins: {
            top: 50,
            bottom: 50,
            left: 72,
            right: 72
          }
        });
        
        // Create a write stream to save the PDF
        const stream = fs.createWriteStream(pdfPath);
        doc.pipe(stream);
        
        // Add title page
        doc.fontSize(24).text('Adobe Experience Platform', { align: 'center' });
        doc.moveDown();
        doc.fontSize(30).text('Term Test PDF', { align: 'center' });
        doc.moveDown(2);
        doc.fontSize(14).text(`Generated on ${new Date().toLocaleDateString()}`, { align: 'center' });
        doc.moveDown(2);
        
        // Add term
        doc.fontSize(20).text(`Term: ${term.name}`, { align: 'center' });
        doc.moveDown(2);
        
        // Process definition with highlighted text preservation
        const processedDefinition = processHtmlForPdf(term.definition || 'No definition provided.');
        const { text: definition, styles } = processedDefinition;
        
        console.log(`Term processing completed for ${term.name}. Found highlighted terms: ${styles.highlighted.length ? styles.highlighted.join(', ') : 'none'}`);
        
        // Maintain a record of where highlighted terms appear in the text for rendering
        const highlightPositions: Array<{start: number, end: number, text: string}> = [];
        
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
          const mergedPositions: Array<{start: number, end: number, text: string}> = [];
          if (highlightPositions.length > 0) {
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
          }
          
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
            
            // Add highlighted text with special styling
            doc.fontSize(12)
              .font('Helvetica-Bold')
              .fillColor('#D35400') // Use orange color like in the app
              .text(pos.text, {
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
        } else {
          // No highlighted terms, render normally
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
        
        // Add categories
        if (term.categories && term.categories.length > 0) {
          doc.fontSize(10)
            .fillColor('#666666')
            .text('Categories: ' + term.categories.map((c: {name: string}) => c.name).join(', '))
            .moveDown(2);
        } else {
          doc.moveDown(2);
        }
        
        // Add term images if available
        if (term.images && term.images.length > 0) {
          // Import axios for image fetching
          const axios = await import('axios').then(m => m.default || m);
          
          // Create tmp directory if it doesn't exist
          const tempDir = path.join(process.cwd(), 'tmp');
          if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
          }
          
          // Process each image
          for (const image of term.images) {
            if (image.firebaseUrl) {
              try {
                doc.fontSize(10)
                  .fillColor('#666666')
                  .text('Image:')
                  .moveDown(0.5);
                
                // Check if the URL is for a webp image (not supported by PDFKit)
                if (image.firebaseUrl.toLowerCase().includes('.webp')) {
                  doc.text(`[WebP image not supported in PDF: ${image.originalName || image.filename}]`);
                  continue;
                }
                
                // Download the image to a temporary file
                const tempFilePath = path.join(tempDir, `temp-image-${image.id}.png`);
                
                // Download the image using axios with a timeout
                const response = await axios({
                  method: 'get',
                  url: image.firebaseUrl,
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
                console.error(`Error processing image for term ${term.name}:`, imgErr);
                doc.text(`[Image could not be loaded: ${image.originalName || image.filename}]`);
              }
            }
          }
        }
        
        // Finalize the PDF
        doc.end();
        
        // Wait for the PDF to be completely written
        await new Promise<void>((resolve, reject) => {
          stream.on('finish', () => {
            console.log(`Single term PDF generated successfully at ${pdfPath}`);
            resolve();
          });
          
          stream.on('error', (err) => {
            console.error('Error generating PDF:', err);
            reject(err);
          });
        });
        
        // Send the PDF file
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="term-${termId}.pdf"`);
        res.sendFile(pdfPath, { root: process.cwd() }, (err) => {
          if (err) {
            console.error('Error sending term PDF:', err);
            res.status(500).send('Error sending term PDF');
          }
        });
      } catch (pdfError) {
        console.error('Error generating term PDF:', pdfError);
        res.status(500).send('Error generating term PDF');
      }
    } catch (error) {
      console.error('Error processing term for PDF:', error);
      res.status(500).send('Error processing term for PDF');
    }
  });

  // Get all terms for CSV export
  app.get("/api/terms/export", async (req, res) => {
    try {
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Add a timestamp parameter to force fresh data
      const timestamp = req.query.t || Date.now();
      
      // Get categoryId if provided
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      
      console.log('Export request:', { 
        categoryId, 
        timestamp,
        ip: req.ip,
        userAgent: req.get('user-agent')
      });
      
      // Wrap in try/catch to handle specific database errors
      try {
        let terms;
        if (categoryId) {
          // If categoryId is provided, filter by that category
          terms = await storage.getTermsByCategory(categoryId);
          console.log(`Exporting terms for category ${categoryId} - found ${terms.length} terms`);
        } else {
          // Otherwise get all terms
          terms = await storage.searchTerms(""); // Empty string returns all terms
          console.log(`Exporting all terms - found ${terms.length} terms`);
        }
        
        if (!terms || !Array.isArray(terms)) {
          console.error("Terms retrieval failed or returned invalid format:", terms);
          return res.status(500).json({ message: "Invalid data format from database" });
        }
        
        // When no terms found, return empty array instead of error
        if (terms.length === 0) {
          console.log("No terms found for export");
          return res.json([]);
        }
        
        // Get metadata for each term in batches to avoid overwhelming the database
        const batchSize = 10;
        const batches = [];
        
        for (let i = 0; i < terms.length; i += batchSize) {
          batches.push(terms.slice(i, i + batchSize));
        }
        
        let termsWithMetadata: any[] = [];
        
        for (const batch of batches) {
          const batchResults = await Promise.all(
            batch.map(async (term) => {
              try {
                const termWithMeta = await storage.getTermWithMetadata(term.id);
                return termWithMeta;
              } catch (err) {
                console.error(`Error getting metadata for term ${term.id}:`, err);
                // Return a minimal version of the term to avoid breaking the export
                return {
                  id: term.id,
                  name: term.name,
                  definition: term.definition || '',
                  isLegacy: term.isLegacy || false,
                  categories: [],
                  upvotes: 0,
                  downvotes: 0
                };
              }
            })
          );
          
          termsWithMetadata = [...termsWithMetadata, ...batchResults.filter(Boolean)];
        }
        
        console.log(`Successfully processed ${termsWithMetadata.length} terms with metadata for export`);
        res.json(termsWithMetadata);
      } catch (dbError) {
        console.error("Database error during export:", dbError);
        res.status(500).json({ message: "Database error during export" });
      }
    } catch (error) {
      console.error("Error exporting terms:", error);
      res.status(500).json({ message: "Failed to export terms" });
    }
  });

  app.get("/api/terms/names", async (req, res) => {
    try {
      const terms = await storage.getTermNames();
      res.json(terms);
    } catch (error) {
      console.error("Error fetching term names:", error);
      res.status(500).json({ message: "Failed to fetch term names" });
    }
  });

  // Get all terms with images
  app.get("/api/terms/with-images", async (req, res) => {
    try {
      // Query the database directly to get term information with their images
      const { rows } = await db.execute(sql`
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
        ORDER BY t.name
      `);

      // Add image count to each term
      const termsWithImages = rows.map(term => ({
        ...term,
        imageCount: Array.isArray(term.images) ? term.images.length : 0
      }));

      console.log(`Found ${termsWithImages ? termsWithImages.length : 0} terms with images`);
      res.json(termsWithImages);
    } catch (error) {
      console.error('Error fetching terms with images:', error);
      res.status(500).json({ error: 'Failed to fetch terms with images' });
    }
  });

  app.get("/api/terms/search", async (req, res) => {
    try {
      // Set cache control headers to prevent caching
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Add a timestamp parameter to force fresh data
      const timestamp = req.query.t || Date.now();
      console.log(`Searching terms with timestamp: ${timestamp}`);
      
      const query = req.query.search as string || "";
      if (!query) {
        return res.json([]);
      }
      
      // SPECIAL HANDLING FOR FIREWALL SEARCH
      if (query.toLowerCase().includes('firewall')) {
        console.log('SPECIAL HANDLING: Found "firewall" in search query');
        
        // Get the LaunchDarkly term which contains firewall in its definition
        const { rows: firewallTerms } = await db.execute(sql`
          SELECT id FROM terms 
          WHERE 
            name = 'LaunchDarkly'
          LIMIT 1
        `);
        
        if (firewallTerms && firewallTerms.length > 0) {
          const termId = firewallTerms[0].id;
          
          // Get complete term data with metadata
          const termWithMetadata = await storage.getTermWithMetadata(termId);
          
          console.log(`Special handling: Returning LaunchDarkly term (ID: ${termId}) for firewall search`);
          return res.json([termWithMetadata]);
        }
      }
      
      // Normal search for non-firewall terms
      // Direct database query with raw SQL to handle HTML content
      const { rows: foundTerms } = await db.execute(sql`
        SELECT id FROM terms 
        WHERE 
          name ILIKE ${`%${query}%`} 
          OR definition::text ILIKE ${`%${query}%`}
        ORDER BY id DESC
      `);
      
      if (!foundTerms || foundTerms.length === 0) {
        console.log(`No terms found matching "${query}"`);
        return res.json([]);
      }
      
      console.log(`Found ${foundTerms.length} terms matching "${query}" via raw SQL`);
      
      // Get complete term data with metadata
      const termsWithMetadata = await Promise.all(
        foundTerms.map(async (term: any) => {
          return await storage.getTermWithMetadata(term.id);
        })
      );
      
      console.log(`Returning ${termsWithMetadata.length} terms with metadata matching "${query}"`);
      res.json(termsWithMetadata);
    } catch (error) {
      console.error("Error searching terms:", error);
      res.status(500).json({ message: "Failed to search terms" });
    }
  });

  app.get("/api/terms/by-category", async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
      const search = req.query.search as string | undefined;
      
      console.log('API: GET /api/terms/by-category', { 
        receivedCategoryId: req.query.categoryId,
        parsedCategoryId: categoryId,
        search 
      });
      
      // If search is provided and no category, use the direct SQL search
      if (search && !categoryId) {
        // Direct database query with raw SQL to handle HTML content
        const { rows: foundTerms } = await db.execute(sql`
          SELECT id FROM terms 
          WHERE 
            name ILIKE ${`%${search}%`} 
            OR definition::text ILIKE ${`%${search}%`}
          ORDER BY id DESC
        `);
        
        if (!foundTerms || foundTerms.length === 0) {
          console.log(`No terms found matching "${search}"`);
          return res.json([]);
        }
        
        console.log(`Found ${foundTerms.length} terms matching "${search}" via raw SQL`);
        
        // Get complete term data with metadata
        const termsWithMetadata = await Promise.all(
          foundTerms.map(async (term: any) => {
            return await storage.getTermWithMetadata(term.id);
          })
        );
        
        console.log(`Returning ${termsWithMetadata.length} terms with metadata matching "${search}"`);
        return res.json(termsWithMetadata);
      }
      
      // Normal flow when no search or when category is provided
      let terms;
      if (!categoryId) {
        terms = await storage.searchTerms('');
      } else {
        terms = await storage.getTermsByCategory(categoryId, search);
      }
      
      // Get metadata for each term
      const termsWithMetadata = await Promise.all(
        terms.map(async (term) => {
          return await storage.getTermWithMetadata(term.id);
        })
      );
      
      console.log(`Found ${termsWithMetadata.length} terms for category ${categoryId || 'all'}`);
      
      res.json(termsWithMetadata);
    } catch (error) {
      console.error("Error fetching terms by category:", error);
      res.status(500).json({ message: "Failed to fetch terms by category" });
    }
  });

  app.get("/api/terms/slug/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      
      // Get term by slug
      const term = await storage.getTermBySlug(slug);
      if (!term) {
        return res.status(404).json({ message: "Term not found" });
      }
      
      // Get full term data with metadata
      const termWithMetadata = await storage.getTermWithMetadata(term.id);
      res.json(termWithMetadata);
    } catch (error) {
      console.error("Error fetching term by slug:", error);
      res.status(500).json({ message: "Failed to fetch term" });
    }
  });

  // Keep this endpoint for backward compatibility
  app.get("/api/terms/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid term ID" });
      }
      
      const term = await storage.getTermWithMetadata(id);
      if (!term) {
        return res.status(404).json({ message: "Term not found" });
      }
      
      res.json(term);
    } catch (error) {
      console.error("Error fetching term:", error);
      res.status(500).json({ message: "Failed to fetch term" });
    }
  });

  app.post("/api/terms", validateBody(createTermSchema), async (req, res) => {
    try {
      // Check if a term with this name already exists
      const existingTerm = await storage.getTermByName(req.body.name);
      if (existingTerm) {
        return res.status(409).json({ message: "A term with this name already exists" });
      }
      
      // Create the term with fixed user ID (admin)
      const termData = {
        name: req.body.name,
        definition: req.body.definition,
        isLegacy: req.body.isLegacy,
        currentTermId: req.body.currentTermId || null,
        createdBy: 1, // Fixed admin user ID
      };
      
      const term = await storage.createTerm(termData);
      
      // Add categories
      for (const categoryName of req.body.categories) {
        // Get or create the category
        let category = await storage.getCategoryByName(categoryName);
        if (!category) {
          category = await storage.createCategory({ name: categoryName });
        }
        
        // Add the term-category relationship
        await storage.addTermCategory({
          termId: term.id,
          categoryId: category.id,
        });
      }
      
      const termWithMetadata = await storage.getTermWithMetadata(term.id);
      res.status(201).json(termWithMetadata);
    } catch (error) {
      console.error("Error creating term:", error);
      res.status(500).json({ message: "Failed to create term" });
    }
  });

  app.patch("/api/terms/:id", validateBody(updateTermSchema), async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid term ID" });
      }
      
      // Check if term exists
      const existingTerm = await storage.getTermById(id);
      if (!existingTerm) {
        return res.status(404).json({ message: "Term not found" });
      }
      
      // If name is changing, check for duplicate
      if (req.body.name && req.body.name !== existingTerm.name) {
        const dupeTerm = await storage.getTermByName(req.body.name);
        if (dupeTerm && dupeTerm.id !== id) {
          return res.status(409).json({ message: "A term with this name already exists" });
        }
      }
      
      // Update the term with properly typed fields
      const termData: any = {};
      if (req.body.name) termData.name = req.body.name;
      if (req.body.definition) termData.definition = req.body.definition;
      if (req.body.isLegacy !== undefined) termData.isLegacy = req.body.isLegacy;
      if (req.body.currentTermId !== undefined) termData.currentTermId = req.body.currentTermId;
      
      const updatedTerm = await storage.updateTerm(id, termData);
      
      // Update categories if provided
      if (req.body.categories) {
        // Remove all existing categories for this term
        await storage.removeTermCategoriesByTermId(id);
        
        // Add new categories
        for (const categoryName of req.body.categories) {
          // Get or create the category
          let category = await storage.getCategoryByName(categoryName);
          if (!category) {
            category = await storage.createCategory({ name: categoryName });
          }
          
          // Add the term-category relationship
          await storage.addTermCategory({
            termId: id,
            categoryId: category.id,
          });
        }
      }
      
      const termWithMetadata = await storage.getTermWithMetadata(id);
      res.json(termWithMetadata);
    } catch (error) {
      console.error("Error updating term:", error);
      res.status(500).json({ message: "Failed to update term" });
    }
  });

  app.delete("/api/terms/:id", requireAdmin, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid term ID" });
      }
      
      // Check if term exists
      const existingTerm = await storage.getTermById(id);
      if (!existingTerm) {
        return res.status(404).json({ message: "Term not found" });
      }
      
      // Delete the term
      const success = await storage.deleteTerm(id);
      
      if (success) {
        res.json({ message: "Term deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete term" });
      }
    } catch (error) {
      console.error("Error deleting term:", error);
      res.status(500).json({ message: "Failed to delete term" });
    }
  });
  
  // Bulk delete terms endpoint
  app.post("/api/terms/bulk-delete", requireAdmin, async (req, res) => {
    try {
      const { ids } = req.body;
      
      // Validate input
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ message: "Invalid request. 'ids' should be a non-empty array of term IDs." });
      }
      
      // Validate that all IDs are numbers
      const validIds = ids.filter(id => !isNaN(Number(id))).map(id => Number(id));
      if (validIds.length !== ids.length) {
        return res.status(400).json({ message: "All term IDs must be valid numbers." });
      }
      
      // Perform bulk delete operation
      const result = await storage.deleteMultipleTerms(validIds);
      
      res.json({
        message: `Bulk delete operation completed: ${result.success} terms deleted successfully, ${result.failed} failed.`,
        success: result.success,
        failed: result.failed
      });
    } catch (error) {
      console.error("Error performing bulk delete operation:", error);
      res.status(500).json({ message: "Failed to perform bulk delete operation" });
    }
  });

  // Vote Routes
  // Create a custom schema without the userId requirement since we're using fixed user ID
  const voteRequestSchema = z.object({
    termId: z.number(),
    isUpvote: z.boolean()
  });

  app.post("/api/votes", validateBody(voteRequestSchema), async (req, res) => {
    try {
      // Check if default user exists, if not create it
      let defaultUser = await storage.getUserById(1);
      if (!defaultUser) {
        // Use raw SQL to create a user with ID 1
        await db.execute(sql`
          INSERT INTO users (id, email, display_name, is_admin) 
          VALUES (1, 'admin@example.com', 'Admin User', true)
        `);
        console.log("Created default user for voting with ID 1");
      }
      
      // Use user ID 1 for all votes (default admin user)
      const vote = await storage.createOrUpdateVote({
        termId: req.body.termId,
        userId: 1, // Fixed user ID for all votes
        isUpvote: req.body.isUpvote,
      });
      
      // Get the updated vote counts for the term
      const { upvotes, downvotes } = await storage.getVotesByTermId(req.body.termId);
      
      // Return the vote along with the updated counts
      res.status(201).json({
        ...vote,
        termUpvotes: upvotes,
        termDownvotes: downvotes
      });
    } catch (error) {
      console.error("Error creating vote:", error);
      res.status(500).json({ message: "Failed to register vote" });
    }
  });

  // Configure multer for file uploads
  // Define uploads directory path - use ./public/uploads to ensure it's accessible via HTTP
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  
  // Ensure the public directory exists with proper permissions
  if (!fs.existsSync(path.join(process.cwd(), 'public'))) {
    try {
      fs.mkdirSync(path.join(process.cwd(), 'public'), { recursive: true, mode: 0o777 });
      console.log(`Created public directory at ${path.join(process.cwd(), 'public')} with full permissions`);
    } catch (err) {
      console.error(`Error creating public directory: ${err}`);
    }
  }
  
  // Now ensure the uploads directory exists with proper permissions
  if (!fs.existsSync(uploadsDir)) {
    try {
      fs.mkdirSync(uploadsDir, { recursive: true, mode: 0o777 });
      console.log(`Created uploads directory at ${uploadsDir} with full permissions`);
      
      // Set permissions explicitly to be safe
      fs.chmodSync(uploadsDir, 0o777);
    } catch (err) {
      console.error(`Error creating uploads directory: ${err}`);
    }
  } else {
    // Make sure existing directory has proper permissions
    try {
      fs.chmodSync(uploadsDir, 0o777);
      console.log(`Updated uploads directory permissions at ${uploadsDir}`);
    } catch (err) {
      console.error(`Error updating uploads directory permissions: ${err}`);
    }
  }
  
  // Serve the uploads directory as static content
  app.use('/uploads', express.static(uploadsDir, {
    maxAge: '1d', // Cache for 1 day
    etag: true
  }));
  console.log(`Serving uploads directory at /uploads from ${uploadsDir}`);
  
  const uploadStorage = multer.diskStorage({
    destination: (req, file, cb) => {
      // Log the directory for debugging
      console.log(`Using uploads directory: ${uploadsDir}`);
      cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
      // Generate a unique filename with original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, uniqueSuffix + ext);
    }
  });

  const upload = multer({ 
    storage: uploadStorage,
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB max file size
    },
    fileFilter: (req, file, cb) => {
      // Accept only image files
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
      }
      cb(null, true);
    }
  });

  // Image upload endpoint with Firebase Storage (requires login)
  app.post("/api/terms/:id/images", requireAuth, upload.single('image'), async (req, res) => {
    try {
      const termId = parseInt(req.params.id);
      if (isNaN(termId)) {
        return res.status(400).json({ message: "Invalid term ID" });
      }

      // Check if term exists
      const term = await storage.getTermById(termId);
      if (!term) {
        // Delete the uploaded file if term doesn't exist
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(404).json({ message: "Term not found" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      try {
        // Default to null for Firebase URL
        let firebaseUrl = null;
        
        try {
          // Try to upload to Firebase, but don't fail if it doesn't work
          const { uploadToFirebaseStorage } = await import('./firebase-utils');
          
          // Read the file from disk
          const fileBuffer = fs.readFileSync(req.file.path);
          
          // Attempt to upload the file to Firebase Storage
          firebaseUrl = await uploadToFirebaseStorage(
            fileBuffer,
            req.file.originalname,
            req.file.mimetype
          );
          
          console.log("Successfully uploaded to Firebase Storage:", firebaseUrl);
        } catch (firebaseError) {
          // Log the error but continue with local storage
          console.error("Failed to upload to Firebase Storage (continuing with local storage):", firebaseError);
          // Firebase URL will remain null
        }
        
        // Create image record in database with Firebase URL (if available)
        const imageData = {
          termId,
          filename: req.file.filename,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          size: req.file.size,
          caption: req.body.caption || null,
          firebaseUrl: firebaseUrl, // May be null if Firebase upload failed
        };

        const image = await storage.addTermImage(imageData);
        
        // Return the image data with the Firebase URL
        res.status(201).json({
          ...image,
          firebaseUrl: firebaseUrl
        });
      } finally {
        // Always clean up the temporary file
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
            console.log(`Temporary file ${req.file.path} deleted after Firebase upload`);
          } catch (err) {
            console.error("Error deleting temporary file after upload:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      
      // Delete the uploaded file if there was an error
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (err) {
          console.error("Error deleting file after upload failure:", err);
        }
      }
      
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // Update image caption (requires login)
  app.patch("/api/images/:id/caption", requireAuth, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) {
        return res.status(400).json({ message: "Invalid image ID" });
      }

      const caption = req.body.caption;
      if (typeof caption !== 'string') {
        return res.status(400).json({ message: "Caption must be a string" });
      }

      // Update the caption
      const image = await storage.updateTermImageCaption(imageId, caption);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      res.json(image);
    } catch (error) {
      console.error("Error updating image caption:", error);
      res.status(500).json({ message: "Failed to update image caption" });
    }
  });

  // Delete image endpoint with Firebase Storage support (admin only)
  app.delete("/api/images/:id", requireAdmin, async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      if (isNaN(imageId)) {
        return res.status(400).json({ message: "Invalid image ID" });
      }

      // Get the image to retrieve the filename and Firebase URL
      const image = await storage.getTermImageById(imageId);
      if (!image) {
        return res.status(404).json({ message: "Image not found" });
      }

      // If the image has a Firebase URL, delete it from Firebase Storage
      if (image.firebaseUrl) {
        try {
          // Import the Firebase Storage utility
          const { deleteFromFirebaseStorage } = await import('./firebase-utils');
          
          // Delete from Firebase Storage
          const deleted = await deleteFromFirebaseStorage(image.firebaseUrl);
          if (deleted) {
            console.log(`Successfully deleted image from Firebase Storage: ${image.firebaseUrl}`);
          } else {
            console.warn(`Failed to delete image from Firebase Storage: ${image.firebaseUrl}`);
          }
        } catch (firebaseError) {
          console.error("Error deleting image from Firebase Storage:", firebaseError);
          // Continue even if Firebase deletion fails
        }
      }

      // Also try to delete the file from local disk as a backup
      // This ensures compatibility with older images that might still be stored locally
      const filePath = path.join(uploadsDir, image.filename);
      console.log(`Attempting to delete local image file at: ${filePath}`);
      try {
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`Successfully deleted local image file: ${filePath}`);
        } else {
          console.log(`Local image file not found at: ${filePath}`);
        }
      } catch (err) {
        console.error("Error deleting local image file:", err);
        // Continue even if file deletion fails (file might not exist)
      }

      // Delete the database record
      const success = await storage.deleteTermImage(imageId);
      if (!success) {
        return res.status(500).json({ message: "Failed to delete image from database" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // No need for special middleware to serve uploads - they're in public now
  // But we'll keep special handling for social media crawlers
  app.use('/uploads', (req, res, next) => {
    if (isLinkedInBot(req)) {
      console.log("LinkedIn bot detected accessing image:", req.url);
      
      // LinkedIn-specific headers - force fresh content
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Robots-Tag', 'all'); // Allow indexing
      res.setHeader('Access-Control-Allow-Origin', '*'); // CORS for images
      res.setHeader('X-LinkedIn-Image', 'true'); // Custom header for LinkedIn
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Add content-type hint for LinkedIn (it sometimes has issues detecting PNG files)
      if (req.url.toLowerCase().endsWith('.png')) {
        res.setHeader('Content-Type', 'image/png');
      } else if (req.url.toLowerCase().endsWith('.jpg') || req.url.toLowerCase().endsWith('.jpeg')) {
        res.setHeader('Content-Type', 'image/jpeg');
      }
    } 
    else if (isWhatsAppCrawler(req)) {
      console.log("WhatsApp crawler detected accessing image:", req.url);
      
      // WhatsApp-specific headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Robots-Tag', 'all');
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    else if (isSocialMediaCrawler(req)) {
      console.log("Social media crawler detected accessing image:", req.url);
      
      // General social media crawlers
      res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute for testing
      res.setHeader('Pragma', 'no-cache'); 
      res.setHeader('X-Robots-Tag', 'all');
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else {
      // Standard cache for regular users
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 1 day
    }
    next();
  });
  
  // Add a direct image handler for debugging and LinkedIn testing
  app.get('/debug-image/:filename', (req, res) => {
    const filename = req.params.filename;
    const imagePath = path.join(uploadsDir, filename);
    
    console.log(`Debug image path: ${imagePath}`);
    console.log(`Debug image exists: ${fs.existsSync(imagePath)}`);
    
    // Check if file exists
    if (fs.existsSync(imagePath)) {
      console.log(`Serving debug image: ${filename}`);
      // Set cache headers
      res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute cache
      res.setHeader('Content-Type', 'image/png');
      // Send the file directly
      return res.sendFile(imagePath);
    } else {
      console.error(`Debug image not found: ${filename}`);
      return res.status(404).send('Image not found');
    }
  });
  
  // Special endpoint for LinkedIn testing
  app.get('/linkedin-test/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const term = await storage.getTermBySlug(slug);
      
      if (!term) {
        return res.status(404).send('Term not found');
      }
      
      const termWithMetadata = await storage.getTermWithMetadata(term.id);
      
      // Always use the production URL for images
      const baseUrl = 'https://lexiconaep.barrymann.com';
      
      // Get the first image if available
      let firstImage = `${baseUrl}/logo-social.png`;
      try {
        if (termWithMetadata.images && 
            termWithMetadata.images.length > 0 && 
            termWithMetadata.images[0]) {
          
          // Check if we have a Firebase URL first (preferred)
          if (termWithMetadata.images[0].firebaseUrl) {
            // Firebase URLs are already absolute, so use them directly
            firstImage = termWithMetadata.images[0].firebaseUrl;
            console.log("Using Firebase image URL for LinkedIn test:", firstImage);
          }
          // Fall back to local storage if no Firebase URL
          else if (termWithMetadata.images[0].filename) {
            firstImage = `${baseUrl}/uploads/${termWithMetadata.images[0].filename}`;
            console.log("Using local term image for LinkedIn test:", firstImage);
          }
        }
      } catch (e) {
        console.error("Error getting image for LinkedIn test:", e?.message || "Unknown error");
      }
      
      // Strip HTML from definition
      const stripHtml = (html: string) => {
        if (!html) return "";
        return html
          .replace(/<\/?[^>]+(>|$)/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      };
      
      const plainDefinition = stripHtml(termWithMetadata.definition);
      const metaDescription = plainDefinition.length > 160
        ? `${plainDefinition.substring(0, 157)}...`
        : plainDefinition;
      
      // No caching for this testing endpoint
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      // Return a simple HTML page with the image
      res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>LinkedIn Test - ${termWithMetadata.name}</title>
          <meta property="og:title" content="${termWithMetadata.name} | Adobe AEP Lexicon">
          <meta property="og:description" content="${metaDescription}">
          <meta property="og:url" content="https://lexiconaep.barrymann.com/term/${slug}">
          <meta property="og:image" content="${firstImage}">
          <meta property="og:image:width" content="1200">
          <meta property="og:image:height" content="630">
          <meta property="og:type" content="article">
        </head>
        <body>
          <h1>${termWithMetadata.name}</h1>
          <p>${metaDescription}</p>
          <div>
            <img src="${firstImage}" alt="${termWithMetadata.name}" style="max-width: 100%;">
          </div>
          <p>Image URL: <a href="${firstImage}">${firstImage}</a></p>
          <p><a href="/term/${slug}">Go to term page</a></p>
        </body>
        </html>
      `);
    } catch (error) {
      console.error('Error in LinkedIn test endpoint:', error);
      res.status(500).send('Error generating LinkedIn test page');
    }
  });

  // Special endpoint for social media crawlers to get meta tags for a specific term
  app.get('/api/social/term/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const term = await storage.getTermBySlug(slug);
      
      if (!term) {
        return res.status(404).json({ error: 'Term not found' });
      }
      
      const termWithMetadata = await storage.getTermWithMetadata(term.id);
      
      // Always use the production URL for social sharing
      // This ensures images will be found when links are shared
      // This is particularly important for LinkedIn which requires fully qualified URLs
      const baseUrl = 'https://lexiconaep.barrymann.com';
      
      // Get the first image if available for og:image - make sure it exists
      // LinkedIn requires absolute URLs for images
      let firstImage;
      if (termWithMetadata.images && 
          termWithMetadata.images.length > 0 && 
          termWithMetadata.images[0]) {
        
        // Check if we have a Firebase URL first
        if (termWithMetadata.images[0].firebaseUrl) {
          // Firebase URLs are already absolute, so use them directly
          firstImage = termWithMetadata.images[0].firebaseUrl;
          console.log("Using Firebase image URL for API social metadata:", firstImage);
        }
        // Fall back to local storage if no Firebase URL
        else if (termWithMetadata.images[0].filename) {
          firstImage = `${baseUrl}/uploads/${termWithMetadata.images[0].filename}`;
          console.log("Using local term image for API social metadata:", firstImage);
        }
      }
      
      if (!firstImage) {
        // Use default logo as fallback
        firstImage = `${baseUrl}/logo-social.png`;
        console.log("Using default logo for API social metadata - no valid term image found");
      }
      
      // Prepare meta description by stripping HTML and truncating the definition
      const stripHtml = (html: string) => {
        if (!html) return "";
        return html
          .replace(/<\/?[^>]+(>|$)/g, " ")
          .replace(/&nbsp;/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      };
      
      const plainDefinition = stripHtml(termWithMetadata.definition);
      const metaDescription = plainDefinition.length > 160
        ? `${plainDefinition.substring(0, 157)}...`
        : plainDefinition;
      
      const metaData = {
        title: `${termWithMetadata.name} | Adobe AEP Lexicon`,
        description: metaDescription,
        url: `https://lexiconaep.barrymann.com/term/${slug}`,
        image: firstImage,
        type: 'article'
      };
      
      res.json(metaData);
    } catch (error) {
      console.error('Error generating social meta data:', error);
      res.status(500).json({ error: 'Error generating meta data' });
    }
  });

  // LinkedIn and other social media need to see the ACTUAL term page, not a social preview
  // This endpoint is now a 301 redirect to the actual term page
  app.get('/social-preview/term/:slug', async (req, res) => {
    try {
      const slug = req.params.slug;
      const term = await storage.getTermBySlug(slug);
      
      if (!term) {
        return res.status(404).send('Term not found');
      }
      
      // Add proper cache headers for LinkedIn
      res.setHeader('Cache-Control', 'public, max-age=3600'); // 1 hour cache
      
      // Get the production URL to redirect to
      const targetUrl = `https://lexiconaep.barrymann.com/term/${slug}`;
      console.log(`Redirecting social preview request to: ${targetUrl}`);
      
      // Send permanent redirect to the actual term page
      // This ensures LinkedIn and other platforms can find the proper OpenGraph tags
      return res.redirect(301, targetUrl);
    } catch (error) {
      console.error('Error handling social preview redirect:', error);
      res.status(500).send('Error redirecting to term page');
    }
  });

  // Serve direct HTML for social media crawlers requesting term pages
  app.get('/term/:slug', async (req, res, next) => {
    const userAgent = req.get('user-agent') || '';
    
    // Only intercept requests from LinkedIn/social crawlers
    if (isSocialMediaCrawler(req)) {
      const slug = req.params.slug;
      console.log(`Social crawler detected visiting term/${slug}:`, userAgent);
      
      try {
        // Generate HTML directly for the crawler
        const html = await generateMetaTagsHtml(`/term/${slug}`);
        
        if (html) {
          // Add headers to prevent caching for social media crawlers
          // This helps with testing and ensures fresh content is always shown
          if (isWhatsAppCrawler(req)) {
            console.log("WhatsApp crawler detected visiting term:", slug);
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
          } else if (isLinkedInBot(req)) {
            console.log("LinkedIn crawler detected visiting term:", slug);
            // LinkedIn crawler-specific headers - force fresh content
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
            res.setHeader('X-LinkedIn-Crawler', 'true');
            res.setHeader('X-Content-Type-Options', 'nosniff');
          } else {
            // Other crawlers - shorter cache time
            res.setHeader('Cache-Control', 'public, max-age=60'); // 1 minute for testing
          }
          
          res.setHeader('X-Robots-Tag', 'all');
          
          // Log that we're serving custom HTML for the crawler
          console.log(`Serving custom crawler HTML for term/${slug}`);
          
          // Send the static HTML with meta tags directly to the crawler
          return res.send(html);
        } else {
          console.error(`Unable to generate HTML for crawler for term/${slug}`);
        }
      } catch (error) {
        console.error("Error generating crawler HTML:", error);
        // Fall through to normal processing if there's an error
      }
    }
    
    // For normal browsers, continue to the React app
    next();
  });

  // Add a special handler for the main pages to detect crawlers
  app.use('*', (req, res, next) => {
    // Special handling for LinkedIn and other social crawlers on any page
    if (isSocialMediaCrawler(req)) {
      console.log("Social media crawler detected on page:", req.originalUrl);
      // Add headers to indicate content is available for social media
      res.setHeader('X-Robots-Tag', 'all');
    }
    
    next();
  });

  const httpServer = createServer(app);
  return httpServer;
}
