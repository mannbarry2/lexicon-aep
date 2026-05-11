import { eq, and, ilike, or, notExists, exists, isNull, asc, sql, desc, count } from "drizzle-orm";
import { db } from "./db";
import { 
  users, categories, terms, termCategories, votes, termImages,
  type User, type InsertUser,
  type Term, type InsertTerm,
  type Category, type InsertCategory,
  type TermCategory, type InsertTermCategory,
  type Vote, type InsertVote,
  type TermImage, type InsertTermImage
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  isAdmin(userId: number): Promise<boolean>;

  // Term operations
  getTermById(id: number): Promise<Term | undefined>;
  getTermByName(name: string): Promise<Term | undefined>;
  getTermBySlug(slug: string): Promise<Term | undefined>;
  getTermsWithPagination(page: number, pageSize: number, search?: string): Promise<{ terms: Term[], total: number }>;
  getTermsByCategory(categoryId?: number, search?: string): Promise<Term[]>;
  searchTerms(query: string): Promise<Term[]>;
  createTerm(term: InsertTerm): Promise<Term>;
  updateTerm(id: number, term: Partial<InsertTerm>): Promise<Term | undefined>;
  deleteTerm(id: number): Promise<boolean>;
  deleteMultipleTerms(ids: number[]): Promise<{ success: number, failed: number }>;
  getTermNames(): Promise<{id: number, name: string, slug: string}[]>;
  
  // Category operations
  getAllCategories(): Promise<Category[]>;
  getCategoryByName(name: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  
  // Term-Category operations
  addTermCategory(termCategory: InsertTermCategory): Promise<void>;
  removeTermCategoriesByTermId(termId: number): Promise<void>;
  getTermCategories(termId: number): Promise<Category[]>;

  // Vote operations
  getVotesByTermId(termId: number): Promise<{ upvotes: number, downvotes: number }>;
  getVoteByUserAndTerm(userId: number, termId: number): Promise<Vote | undefined>;
  createOrUpdateVote(vote: InsertVote): Promise<Vote>;
  getLegacyTerms(currentTermId: number): Promise<Term[]>;
  getCurrentTerm(legacyTermId: number): Promise<Term | undefined>;
  
  // Term Images operations
  getTermImagesByTermId(termId: number): Promise<TermImage[]>;
  getTermImageById(imageId: number): Promise<TermImage | undefined>;
  addTermImage(image: InsertTermImage): Promise<TermImage>;
  updateTermImageCaption(imageId: number, caption: string): Promise<TermImage | undefined>;
  deleteTermImage(imageId: number): Promise<boolean>;
  
  // Term metadata
  getTermWithMetadata(termId: number): Promise<any>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUserById(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    // Check if admin email
    const isAdmin = user.email === "mannbarry2@gmail.com";
    const result = await db.insert(users).values({...user, isAdmin}).returning();
    return result[0];
  }

  async isAdmin(userId: number): Promise<boolean> {
    const user = await this.getUserById(userId);
    return user?.isAdmin || false;
  }

  // Term operations
  async getTermById(id: number): Promise<Term | undefined> {
    const result = await db.select().from(terms).where(eq(terms.id, id)).limit(1);
    return result[0];
  }

  async getTermByName(name: string): Promise<Term | undefined> {
    const result = await db.select().from(terms).where(eq(terms.name, name)).limit(1);
    return result[0];
  }
  
  async getTermBySlug(slug: string): Promise<Term | undefined> {
    const result = await db.select().from(terms).where(eq(terms.slug, slug)).limit(1);
    return result[0];
  }

  async getTermsWithPagination(
    page: number, 
    pageSize: number, 
    search?: string, 
    categoryId?: number
  ): Promise<{ terms: Term[], total: number }> {
    let baseQuery;
    
    // If we need to filter by category, we need to join with termCategories
    if (categoryId) {
      baseQuery = db
        .select({
          id: terms.id,
          name: terms.name,
          definition: terms.definition,
          isLegacy: terms.isLegacy,
          currentTermId: terms.currentTermId,
          createdBy: terms.createdBy,
          createdAt: terms.createdAt,
          updatedAt: terms.updatedAt
        })
        .from(terms)
        .innerJoin(
          termCategories,
          eq(terms.id, termCategories.termId)
        )
        .where(eq(termCategories.categoryId, categoryId));
    } else {
      baseQuery = db.select().from(terms);
    }
    
    // Add search filter if provided
    let query = baseQuery;
    if (search) {
      query = query.where(
        or(
          ilike(terms.name, `%${search}%`),
          ilike(terms.definition, `%${search}%`)
        )
      );
    }
    
    // Get total count - need to use a separate query to get accurate count
    let countQuery;
    if (categoryId) {
      countQuery = db
        .select({ count: count() })
        .from(terms)
        .innerJoin(
          termCategories,
          eq(terms.id, termCategories.termId)
        )
        .where(eq(termCategories.categoryId, categoryId));
    } else {
      countQuery = db.select({ count: count() }).from(terms);
    }
    
    // Add search filter to count query if provided
    if (search) {
      countQuery = countQuery.where(
        or(
          ilike(terms.name, `%${search}%`),
          ilike(terms.definition, `%${search}%`)
        )
      );
    }
    
    const totalResult = await countQuery;
    const total = Number(totalResult[0].count);
    
    // Get paginated results
    const offset = (page - 1) * pageSize;
    
    // Order by newest first (ID descending)
    const result = await query
      .limit(pageSize)
      .offset(offset)
      .orderBy(desc(terms.id));
    
    return { terms: result, total };
  }

  async getTermsByCategory(categoryId?: number, search?: string): Promise<Term[]> {
    let query = db
      .select({
        id: terms.id,
        name: terms.name,
        definition: terms.definition,
        isLegacy: terms.isLegacy,
        currentTermId: terms.currentTermId,
        createdBy: terms.createdBy,
        createdAt: terms.createdAt,
        updatedAt: terms.updatedAt
      })
      .from(terms);
    
    // If categoryId is provided, filter by category
    if (categoryId) {
      query = query
        .innerJoin(termCategories, eq(terms.id, termCategories.termId))
        .where(eq(termCategories.categoryId, categoryId));
    }
    
    // If search is provided, add search condition
    if (search) {
      query = query.where(
        or(
          ilike(terms.name, `%${search}%`),
          ilike(terms.definition, `%${search}%`)
        )
      );
    }
    
    return await query.orderBy(terms.name);
  }

  async searchTerms(query: string): Promise<Term[]> {
    // If query is empty, return all terms without limit for export
    if (!query.trim()) {
      return await db
        .select()
        .from(terms)
        .orderBy(desc(terms.id)); // Order by ID descending to get newest first
    }
    
    // Use a more robust search approach with plain SQL
    // This adds special handling for full-text search within HTML content
    const searchResults = await db.execute(sql`
      SELECT * FROM terms
      WHERE 
        name ILIKE ${`%${query}%`}
        OR
        CAST(definition AS text) ILIKE ${`%${query}%`}
      ORDER BY id DESC
    `);
    
    return searchResults.rows as Term[];
  }

  async createTerm(termData: InsertTerm): Promise<Term> {
    // Import here to avoid circular dependencies
    const { generateUniqueSlug } = await import('./utils/slug-generator');
    
    // Generate a unique slug for the term
    const slug = await generateUniqueSlug(termData.name);
    
    // Add the slug to the term data
    const dataWithSlug = {
      ...termData,
      slug
    };
    
    const result = await db.insert(terms).values(dataWithSlug).returning();
    return result[0];
  }

  async updateTerm(id: number, termData: Partial<InsertTerm>): Promise<Term | undefined> {
    // Check if we need to update the slug (if name is changing)
    let updatedData = { ...termData };
    
    if (termData.name) {
      // Import here to avoid circular dependencies
      const { generateUniqueSlug } = await import('./utils/slug-generator');
      
      // Generate a new slug based on the new name
      const slug = await generateUniqueSlug(termData.name, id);
      updatedData = {
        ...updatedData,
        slug
      };
    }
    
    // Add updatedAt timestamp
    const dataWithTimestamp = {
      ...updatedData, 
      updatedAt: new Date()
    };
    
    const result = await db
      .update(terms)
      .set(dataWithTimestamp)
      .where(eq(terms.id, id))
      .returning();
    
    return result[0];
  }

  async deleteTerm(id: number): Promise<boolean> {
    // First delete related term categories
    await db.delete(termCategories).where(eq(termCategories.termId, id));
    
    // Then delete related votes
    await db.delete(votes).where(eq(votes.termId, id));
    
    // Delete related images
    await db.delete(termImages).where(eq(termImages.termId, id));
    
    // Finally delete the term
    const result = await db.delete(terms).where(eq(terms.id, id)).returning();
    return result.length > 0;
  }

  async deleteMultipleTerms(ids: number[]): Promise<{ success: number, failed: number }> {
    let success = 0;
    let failed = 0;

    try {
      // Process terms one by one for proper error handling and tracking
      for (const id of ids) {
        try {
          // First delete related term categories
          await db.delete(termCategories).where(eq(termCategories.termId, id));
          
          // Then delete related votes
          await db.delete(votes).where(eq(votes.termId, id));
          
          // Delete related images
          await db.delete(termImages).where(eq(termImages.termId, id));
          
          // Finally delete the term
          const result = await db.delete(terms).where(eq(terms.id, id)).returning();
          
          if (result.length > 0) {
            success++;
          } else {
            failed++;
          }
        } catch (error) {
          console.error(`Error deleting term ID ${id}:`, error);
          failed++;
        }
      }
      
      return { success, failed };
    } catch (error) {
      console.error("Error in bulk term deletion:", error);
      return { success, failed: ids.length - success };
    }
  }

  async getTermNames(): Promise<{id: number, name: string, slug: string}[]> {
    return await db
      .select({
        id: terms.id,
        name: terms.name,
        slug: terms.slug
      })
      .from(terms)
      .orderBy(terms.name);
  }

  // Category operations
  async getAllCategories(): Promise<Category[]> {
    return await db.select().from(categories).orderBy(categories.name);
  }

  async getCategoryByName(name: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.name, name)).limit(1);
    return result[0];
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(category).returning();
    return result[0];
  }

  // Term-Category operations
  async addTermCategory(termCategory: InsertTermCategory): Promise<void> {
    await db.insert(termCategories).values(termCategory);
  }

  async removeTermCategoriesByTermId(termId: number): Promise<void> {
    await db.delete(termCategories).where(eq(termCategories.termId, termId));
  }

  async getTermCategories(termId: number): Promise<Category[]> {
    const result = await db
      .select({
        id: categories.id,
        name: categories.name
      })
      .from(categories)
      .innerJoin(termCategories, eq(categories.id, termCategories.categoryId))
      .where(eq(termCategories.termId, termId))
      .orderBy(categories.name);
    
    return result;
  }

  // Vote operations
  async getVotesByTermId(termId: number): Promise<{ upvotes: number, downvotes: number }> {
    // Count upvotes
    const upvotesResult = await db
      .select({ count: count() })
      .from(votes)
      .where(and(eq(votes.termId, termId), eq(votes.isUpvote, true)));
    
    // Count downvotes
    const downvotesResult = await db
      .select({ count: count() })
      .from(votes)
      .where(and(eq(votes.termId, termId), eq(votes.isUpvote, false)));
    
    return {
      upvotes: Number(upvotesResult[0].count),
      downvotes: Number(downvotesResult[0].count)
    };
  }

  async getVoteByUserAndTerm(userId: number, termId: number): Promise<Vote | undefined> {
    const result = await db
      .select()
      .from(votes)
      .where(
        and(
          eq(votes.userId, userId),
          eq(votes.termId, termId)
        )
      )
      .limit(1);
    
    return result[0];
  }

  async createOrUpdateVote(vote: InsertVote): Promise<Vote> {
    // Always create a new vote record - this allows the same user to vote multiple times
    // This is what the customer requested - the ability to vote a term up to any number
    const result = await db.insert(votes).values(vote).returning();
    return result[0];
  }

  // Related terms
  async getLegacyTerms(currentTermId: number): Promise<Term[]> {
    return await db
      .select()
      .from(terms)
      .where(
        and(
          eq(terms.currentTermId, currentTermId),
          eq(terms.isLegacy, true)
        )
      )
      .orderBy(terms.name);
  }

  async getCurrentTerm(legacyTermId: number): Promise<Term | undefined> {
    const legacyTerm = await this.getTermById(legacyTermId);
    if (!legacyTerm || !legacyTerm.currentTermId) return undefined;
    
    return await this.getTermById(legacyTerm.currentTermId);
  }

  // Term Image operations
  async getTermImagesByTermId(termId: number): Promise<TermImage[]> {
    return await db
      .select()
      .from(termImages)
      .where(eq(termImages.termId, termId))
      .orderBy(desc(termImages.uploadedAt));
  }
  
  async getTermImageById(imageId: number): Promise<TermImage | undefined> {
    const result = await db
      .select()
      .from(termImages)
      .where(eq(termImages.id, imageId))
      .limit(1);
    
    return result[0];
  }
  
  async addTermImage(image: InsertTermImage): Promise<TermImage> {
    const result = await db.insert(termImages).values(image).returning();
    return result[0];
  }
  
  async updateTermImageCaption(imageId: number, caption: string): Promise<TermImage | undefined> {
    const result = await db
      .update(termImages)
      .set({ caption })
      .where(eq(termImages.id, imageId))
      .returning();
    
    return result[0];
  }
  
  async deleteTermImage(imageId: number): Promise<boolean> {
    const result = await db
      .delete(termImages)
      .where(eq(termImages.id, imageId))
      .returning();
    
    return result.length > 0;
  }

  // Get term with all metadata
  async getTermWithMetadata(termId: number): Promise<any> {
    const term = await this.getTermById(termId);
    if (!term) return null;
    
    const categories = await this.getTermCategories(termId);
    const { upvotes, downvotes } = await this.getVotesByTermId(termId);
    const images = await this.getTermImagesByTermId(termId);
    
    // Get related terms
    let currentTerm = null;
    let legacyNames = null;
    
    if (term.isLegacy && term.currentTermId) {
      const current = await this.getTermById(term.currentTermId);
      if (current) {
        currentTerm = {
          id: current.id,
          name: current.name,
          slug: current.slug
        };
      }
    } else {
      // If it's a current term, get legacy terms that reference it
      const legacyTerms = await this.getLegacyTerms(termId);
      if (legacyTerms.length > 0) {
        legacyNames = legacyTerms.map(t => ({
          id: t.id,
          name: t.name,
          slug: t.slug
        }));
      }
    }
    
    return {
      ...term,
      categories,
      upvotes,
      downvotes,
      currentTerm,
      legacyNames,
      images
    };
  }
}

export const storage = new DatabaseStorage();
