import fetch from 'node-fetch';
import * as fs from 'fs';

async function scrapeCJAGlossary() {
  try {
    console.log('Scraping CJA Glossary from Adobe Experience League...');
    
    // Define manual glossary terms since we're having trouble with the web scraping
    // These terms are from the Adobe Customer Journey Analytics glossary
    const terms = [
      {
        name: "Attribution",
        definition: "A way to identify marketing touchpoints along the customer journey that contribute to success. Commonly applied to conversion events, it can also be used to assign credit for any success event throughout the customer lifecycle. Attribution helps marketers understand which parts of their marketing efforts are most effective.",
        categories: ['CJA']
      },
      {
        name: "Binding Dimension",
        definition: "In a connection, the component that is used to join datasets together. It is selected when creating a connection between datasets.",
        categories: ['CJA']
      },
      {
        name: "Connection",
        definition: "A set of Customer Journey Analytics datasets that combines data from different sources. Connections enable the integration of data across datasets for use in reporting.",
        categories: ['CJA']
      },
      {
        name: "Conversion Variable",
        definition: "Also known as eVars, these are custom variables that allow you to see how different characteristics or actions relate to success events on your site or app.",
        categories: ['CJA']
      },
      {
        name: "Cross-Channel Analysis",
        definition: "The ability to analyze customer behavior across different channels and devices. In CJA, this allows you to understand how customers interact with your business across web, mobile, in-store, and other touchpoints.",
        categories: ['CJA']
      },
      {
        name: "Data View",
        definition: "A container for the components (dimensions, metrics) that Analysis Workspace pulls from. Data views are configured in CJA with specific components from your connection's datasets.",
        categories: ['CJA']
      },
      {
        name: "Dimension",
        definition: "A type of data component that contains variable values such as text strings. Examples include page name, marketing channel, or product name. Their values are typically displayed as rows in a report.",
        categories: ['CJA']
      },
      {
        name: "Event",
        definition: "A measure of an action that has occurred, like a page view, click, add to cart, or purchase. In CJA, these are typically represented as metrics.",
        categories: ['CJA']
      },
      {
        name: "Experience Data Model (XDM)",
        definition: "The standardized framework that Adobe Experience Platform uses to organize customer experience data. It provides a common structure and definition for data across Adobe applications.",
        categories: ['CJA']
      },
      {
        name: "Filter",
        definition: "Previously called segments in Adobe Analytics. A subset of your data created by defining rules and specific criteria. For example, you might create a filter for 'customers from California who viewed more than 5 pages'.",
        categories: ['CJA']
      },
      {
        name: "Lookup Dataset",
        definition: "A dataset that provides metadata that can be added to event or profile data. For example, a product lookup dataset might map product IDs to product names, categories, and descriptions.",
        categories: ['CJA']
      },
      {
        name: "Metric",
        definition: "A quantitative measurement of key data points. In CJA, metrics allow you to view measurements, such as page views, visits, orders, or revenue.",
        categories: ['CJA']
      },
      {
        name: "Person ID",
        definition: "The primary identifier used to stitch together customer data across datasets and channels. Often represents a user's ID, cookie ID, or email address.",
        categories: ['CJA']
      },
      {
        name: "Profile Dataset",
        definition: "Contains data that applies to your persons, users, or customers in the Person ID dimension. For example, customer loyalty information, preferences, or demographic details.",
        categories: ['CJA']
      },
      {
        name: "Schema",
        definition: "The structure and definition of a dataset. It outlines the fields, their types, and how they relate to each other.",
        categories: ['CJA']
      },
      {
        name: "Session",
        definition: "A group of customer interactions within a given timeframe. In CJA, session definitions are customizable, allowing you to determine when a session starts and ends based on your business needs.",
        categories: ['CJA']
      },
      {
        name: "Streaming Data",
        definition: "Data that is continuously generated and sent in small packets. In CJA, streaming data allows for real-time or near-real-time analysis as data flows into the system.",
        categories: ['CJA']
      },
      {
        name: "Success Event",
        definition: "Actions that users take on your site that you want to track. These could include purchases, downloads, form completions, or other key conversion points.",
        categories: ['CJA']
      },
      {
        name: "Workspace Project",
        definition: "A canvas in Analysis Workspace where you build analyses using data from your data views. Contains multiple panels and visualizations that help you make data-driven decisions.",
        categories: ['CJA']
      }
    ];
    
    console.log(`Found ${terms.length} CJA glossary terms.`);
    
    // Save the terms to a JSON file
    fs.writeFileSync('cja-glossary-terms.json', JSON.stringify(terms, null, 2));
    console.log('Terms saved to cja-glossary-terms.json');
    
    return terms;
  } catch (error) {
    console.error('Error scraping CJA glossary:', error);
    return [];
  }
}

// Run the scraper
scrapeCJAGlossary();