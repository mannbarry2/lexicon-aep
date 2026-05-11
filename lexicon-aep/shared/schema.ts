import { pgTable, text, serial, integer, boolean, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name"),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users)
  .pick({
    email: true,
    displayName: true,
    isAdmin: true,
  });

// Terms table
export const terms = pgTable("terms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  definition: text("definition").notNull(),
  isLegacy: boolean("is_legacy").default(false),
  currentTermId: integer("current_term_id").references(() => terms.id),
  createdBy: integer("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTermSchema = createInsertSchema(terms).pick({
  name: true,
  slug: true,
  definition: true,
  isLegacy: true,
  currentTermId: true,
  createdBy: true,
});

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
});

// Term categories join table
export const termCategories = pgTable("term_categories", {
  termId: integer("term_id").references(() => terms.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id).notNull(),
}, (t) => ({
  pk: primaryKey({ columns: [t.termId, t.categoryId] }),
}));

export const insertTermCategorySchema = createInsertSchema(termCategories);

// Votes table
export const votes = pgTable("votes", {
  id: serial("id").primaryKey(),
  termId: integer("term_id").references(() => terms.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  isUpvote: boolean("is_upvote").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertVoteSchema = createInsertSchema(votes).pick({
  termId: true,
  userId: true,
  isUpvote: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Term = typeof terms.$inferSelect;
export type InsertTerm = z.infer<typeof insertTermSchema>;

export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;

export type TermCategory = typeof termCategories.$inferSelect;
export type InsertTermCategory = z.infer<typeof insertTermCategorySchema>;

export type Vote = typeof votes.$inferSelect;
export type InsertVote = z.infer<typeof insertVoteSchema>;

// Extended schemas for the API
export const termWithMetadataSchema = z.object({
  id: z.number(),
  name: z.string(),
  slug: z.string(),
  definition: z.string(),
  isLegacy: z.boolean(),
  currentTermId: z.number().nullable(),
  createdBy: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
  categories: z.array(z.object({
    id: z.number(),
    name: z.string(),
  })),
  upvotes: z.number(),
  downvotes: z.number(),
  currentTerm: z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
  }).nullable(),
  legacyNames: z.array(z.object({
    id: z.number(),
    name: z.string(),
    slug: z.string(),
  })).optional(),
  images: z.array(z.object({
    id: z.number(),
    filename: z.string(),
    originalName: z.string(),
    mimeType: z.string(),
    size: z.number(),
    uploadedAt: z.string(),
    caption: z.string().nullable(),
    firebaseUrl: z.string().nullable().optional(),
  })).optional(),
});

export type TermWithMetadata = z.infer<typeof termWithMetadataSchema>;

export const createTermSchema = z.object({
  name: z.string().min(1, "Term name is required"),
  definition: z.string().min(1, "Definition is required"),
  isLegacy: z.boolean().default(false),
  currentTermId: z.number().nullable().optional(),
  categories: z.array(z.string()).min(1, "At least one category is required"),
});

export type CreateTermInput = z.infer<typeof createTermSchema>;

export const updateTermSchema = createTermSchema.partial();
export type UpdateTermInput = z.infer<typeof updateTermSchema>;

// Term Images table
export const termImages = pgTable("term_images", {
  id: serial("id").primaryKey(),
  termId: integer("term_id").references(() => terms.id).notNull(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow(),
  caption: text("caption"),
  firebaseUrl: text("firebase_url"), // URL for Firebase Storage
});

export const insertTermImageSchema = createInsertSchema(termImages).pick({
  termId: true,
  filename: true,
  originalName: true,
  mimeType: true,
  size: true,
  caption: true,
  firebaseUrl: true,
});

export type TermImage = typeof termImages.$inferSelect;
export type InsertTermImage = z.infer<typeof insertTermImageSchema>;
