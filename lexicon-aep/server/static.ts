import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { isSocialMediaCrawler, generateMetaTagsHtml } from "./social-crawler";

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // Crawler interception for term pages. Sits immediately before the
  // static SPA shell so it cannot be shadowed by upstream caches or
  // middleware that prevented the equivalent handler in routes.ts from
  // firing. Browsers fall through to the SPA.
  app.get("/term/:slug", async (req, res, next) => {
    if (!isSocialMediaCrawler(req)) return next();
    try {
      const html = await generateMetaTagsHtml(`/term/${req.params.slug}`);
      if (!html) return next();
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Vary", "User-Agent");
      res.setHeader("X-Robots-Tag", "all");
      log(`crawler OG served for /term/${req.params.slug}`, "social");
      return res.send(html);
    } catch (err) {
      console.error("Crawler meta-tag generation failed:", err);
      next();
    }
  });

  const distPath = path.resolve(import.meta.dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }
  app.use(express.static(distPath));
  app.use("*", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
