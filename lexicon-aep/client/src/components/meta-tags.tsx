import { Helmet } from 'react-helmet';

interface MetaTagsProps {
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: 'website' | 'article';
  twitterCard?: 'summary' | 'summary_large_image';
}

export function MetaTags({
  title,
  description,
  canonical,
  image = '/logo-social.png', // Default image
  type = 'website',
  twitterCard = 'summary'
}: MetaTagsProps) {
  const siteName = 'Adobe AEP Lexicon';
  const domain = 'lexiconaep.com';
  const fullTitle = `${title} | ${siteName}`;
  
  return (
    <Helmet>
      {/* Basic Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {canonical && <link rel="canonical" href={canonical} />}
      
      {/* Open Graph Meta Tags for Facebook, LinkedIn, etc. */}
      <meta property="og:site_name" content={siteName} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={type} />
      {canonical && <meta property="og:url" content={canonical} />}
      {image && <meta property="og:image" content={image.startsWith('http') ? image : `https://${domain}${image}`} />}
      {image && <meta property="og:image:secure_url" content={image.startsWith('http') ? image : `https://${domain}${image}`} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      {image && <meta property="og:image:alt" content={`Image for ${title}`} />}
      {/* LinkedIn specific tags */}
      <meta property="og:image:type" content="image/png" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content={twitterCard} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      {image && <meta name="twitter:image" content={image.startsWith('http') ? image : `https://${domain}${image}`} />}
    </Helmet>
  );
}