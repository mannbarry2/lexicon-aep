import { Request } from 'express';
import { storage } from './storage';

// List of common social media crawler user agents
const SOCIAL_CRAWLER_AGENTS = [
  'facebookexternalhit',
  'Facebot',
  'linkedinbot',
  'LinkedInBot',
  'twitterbot',
  'whatsapp',
  'Whatsapp',
  'telegram',
  'discord',
  'slackbot',
  'LinkedInApp',
  'Twitterbot',
  'Discordbot',
  'Instagram',
  'viber',
  'WhatsApp'
];

// Check if the request is coming from a social media crawler
export function isSocialMediaCrawler(req: Request): boolean {
  const userAgent = req.get('user-agent') || '';
  const referer = req.get('referer') || '';
  
  // Check user agent
  const isAgentMatch = SOCIAL_CRAWLER_AGENTS.some(agent => 
    userAgent.toLowerCase().includes(agent.toLowerCase())
  );
  
  // Also check referer as some crawlers don't clearly identify in user agent
  const isRefererMatch = SOCIAL_CRAWLER_AGENTS.some(agent => 
    referer.toLowerCase().includes(agent.toLowerCase())
  );
  
  // Additional check for WhatsApp which might use regular browsers with certain headers
  const isWhatsAppWithoutUserAgent = referer.toLowerCase().includes('whatsapp') || 
                                    req.get('x-forwarded-for') === 'whatsapp';
  
  return isAgentMatch || isRefererMatch || isWhatsAppWithoutUserAgent;
}

// Check if a request is from a LinkedIn bot specifically
export function isLinkedInBot(req: Request): boolean {
  const userAgent = req.get('user-agent') || '';
  return userAgent.toLowerCase().includes('linkedinbot') || 
         userAgent.toLowerCase().includes('linkedinapp');
}

// Check if request is from WhatsApp specifically
export function isWhatsAppCrawler(req: Request): boolean {
  const userAgent = req.get('user-agent') || '';
  const referer = req.get('referer') || '';
  
  return userAgent.toLowerCase().includes('whatsapp') || 
         referer.toLowerCase().includes('whatsapp');
}

// Generate HTML with Open Graph meta tags for social media crawlers
export async function generateMetaTagsHtml(url: string, host: string = 'lexiconaep.com', protocol: string = 'https'): Promise<string | null> {
  // Check if it's a term detail page
  const termSlugMatch = url.match(/\/term\/([^\/]+)$/);
  
  if (termSlugMatch) {
    const slug = termSlugMatch[1];
    
    try {
      // Fetch term data using slug
      const term = await storage.getTermBySlug(slug);
      
      if (!term) {
        console.error(`Social crawler: Term not found for slug ${slug}`);
        return null;
      }
      
      // Fetch additional metadata
      const termWithMetadata = await storage.getTermWithMetadata(term.id);
      
      if (!termWithMetadata) {
        console.error(`Social crawler: Metadata not found for term ${term.id}`);
        return null;
      }
      
      // Get the full server URL - always use https://lexiconaep.com for production
      const baseUrl = 'https://lexiconaep.com';
      
      // Log the complete term data for debugging
      console.log(`Social crawler: Generated metadata for term ${term.name} (${slug})`);
      
      // Get the first image if available, make sure it's an absolute URL
      // Always use absolute production URLs for social media crawlers
      let firstImage;
      try {
        if (termWithMetadata.images && 
            Array.isArray(termWithMetadata.images) && 
            termWithMetadata.images.length > 0 && 
            termWithMetadata.images[0] && 
            typeof termWithMetadata.images[0] === 'object') {
          
          // First check if we have a Firebase URL (preferred option)
          if (termWithMetadata.images[0].firebaseUrl && 
              typeof termWithMetadata.images[0].firebaseUrl === 'string') {
            // Firebase URLs are already absolute, so use them directly
            firstImage = termWithMetadata.images[0].firebaseUrl;
            console.log("Social crawler using Firebase image URL:", firstImage);
          }
          // Fall back to local storage if no Firebase URL
          else if (termWithMetadata.images[0].filename && 
                 typeof termWithMetadata.images[0].filename === 'string') {
            // Always use the absolute production URL for social media images
            // This ensures LinkedIn, WhatsApp, etc. can access the image even if it only exists in production
            firstImage = `https://lexiconaep.com/uploads/${termWithMetadata.images[0].filename}`;
            console.log("Social crawler using local term image:", firstImage);
          } else {
            throw new Error("No valid image URL found");
          }
        } else {
          throw new Error("Invalid image structure");
        }
      } catch (e: any) {
        // Always fall back to logo if there's any issue with the image
        firstImage = `${baseUrl}/logo-social.png`;
        console.log("Social crawler using default logo (no valid term image):", e?.message || "Unknown error");
      }
      
      // Prepare meta description by stripping HTML and truncating the definition
      // LinkedIn has issues with HTML content in meta descriptions
      const stripHtml = (html: string) => {
        return html.replace(/<\/?[^>]+(>|$)/g, "").replace(/&nbsp;/g, " ");
      };
      
      const plainDefinition = stripHtml(termWithMetadata.definition);
      const metaDescription = plainDefinition.length > 160
        ? `${plainDefinition.substring(0, 157)}...`
        : plainDefinition;
      
      // Get image dimensions - LinkedIn needs exact dimensions
      const imageWidth = termWithMetadata.images && termWithMetadata.images.length > 0 ? "1200" : "1200";
      const imageHeight = termWithMetadata.images && termWithMetadata.images.length > 0 ? "630" : "630";
      const imageType = termWithMetadata.images && termWithMetadata.images.length > 0 ? "image/png" : "image/png";
      
      // Generate HTML with proper meta tags - optimized for social media crawlers
      return `<!DOCTYPE html>
<html lang="en" prefix="og: http://ogp.me/ns# fb: http://ogp.me/ns/fb# article: http://ogp.me/ns/article#">
<head>
  <meta charset="UTF-8">
  <title>${termWithMetadata.name} | Adobe AEP Lexicon</title>
  <meta name="description" content="${metaDescription}">
  <link rel="canonical" href="https://lexiconaep.com/term/${slug}">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://lexiconaep.com/term/${slug}">
  <meta property="og:title" content="${termWithMetadata.name} | Adobe AEP Lexicon">
  <meta property="og:description" content="${metaDescription}">
  <meta property="og:image" content="${firstImage}">
  <meta property="og:image:secure_url" content="${firstImage}">
  <meta property="og:image:alt" content="Image for ${termWithMetadata.name}">
  <meta property="og:image:width" content="${imageWidth}">
  <meta property="og:image:height" content="${imageHeight}">
  <meta property="og:image:type" content="${imageType}">
  <meta property="og:site_name" content="Adobe AEP Lexicon">
  
  <!-- LinkedIn specific -->
  <meta name="author" content="Adobe AEP Lexicon">
  <meta property="article:published_time" content="${new Date(termWithMetadata.updatedAt).toISOString()}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${termWithMetadata.name} | Adobe AEP Lexicon">
  <meta name="twitter:description" content="${metaDescription}">
  <meta name="twitter:image" content="${firstImage}">
  
  <!-- Cache control headers -->
  <meta http-equiv="Cache-Control" content="public, max-age=86400">
  
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    img {
      max-width: 100%;
      height: auto;
      margin: 20px 0;
      border: 1px solid #eee;
    }
    .term-header {
      border-left: 4px solid #0E76A8;
      padding-left: 15px;
      margin: 30px 0;
    }
    .term-definition {
      background: #f9f9f9;
      padding: 20px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    .term-image {
      text-align: center;
    }
    .redirect-message {
      background: #f0f0f0;
      padding: 15px;
      text-align: center;
      border-radius: 4px;
      margin-top: 30px;
    }
  </style>
  
  <meta http-equiv="refresh" content="0;url=https://lexiconaep.com/term/${slug}">
</head>
<body>
  <div class="term-header">
    <h1>${termWithMetadata.name}</h1>
  </div>
  
  <div class="term-definition">
    <!-- We're purposely not using the HTML content directly for LinkedIn crawler to avoid formatting issues -->
    <!-- It tends to work better with plain text content -->
    <p>${stripHtml(termWithMetadata.definition)}</p>
  </div>
  
  ${termWithMetadata.images && termWithMetadata.images.length > 0 && 
    termWithMetadata.images[0] && (termWithMetadata.images[0].filename || termWithMetadata.images[0].firebaseUrl) ? 
    `<div class="term-image">
      <img src="${firstImage}" alt="Image for ${termWithMetadata.name}" width="${imageWidth}" height="${imageHeight}">
    </div>` : 
    `<div class="term-image">
      <img src="${baseUrl}/logo-social.png" alt="Adobe AEP Lexicon" width="1200" height="630">
    </div>`}
  
  <div class="redirect-message">
    <p>Redirecting to <a href="https://lexiconaep.com/term/${slug}">Adobe AEP Lexicon</a>...</p>
  </div>
</body>
</html>`;
    } catch (error) {
      console.error('Error generating meta tags for social crawler:', error);
      return null;
    }
  }
  
  // For the homepage or other pages, return default meta tags
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Adobe AEP Lexicon | The definitive terminology guide for Adobe Experience Platform</title>
  <meta name="description" content="A comprehensive dictionary of Adobe Experience Platform terms, definitions, and concepts maintained by the AEP community.">
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="https://lexiconaep.com">
  <meta property="og:title" content="Adobe AEP Lexicon">
  <meta property="og:description" content="The definitive terminology guide for Adobe Experience Platform">
  <meta property="og:image" content="https://lexiconaep.com/logo-social.png">
  <meta property="og:image:secure_url" content="https://lexiconaep.com/logo-social.png">
  <meta property="og:image:alt" content="Adobe AEP Lexicon Logo">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Adobe AEP Lexicon">
  
  <!-- LinkedIn specific -->
  <meta property="og:image:type" content="image/png">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Adobe AEP Lexicon">
  <meta name="twitter:description" content="The definitive terminology guide for Adobe Experience Platform">
  <meta name="twitter:image" content="https://lexiconaep.com/logo-social.png">
  
  <meta http-equiv="refresh" content="0;url=https://lexiconaep.com">
</head>
<body>
  <p>Redirecting to <a href="https://lexiconaep.com">Adobe AEP Lexicon</a>...</p>
</body>
</html>
  `;
}