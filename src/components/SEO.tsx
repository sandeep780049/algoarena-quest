import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: 'website' | 'article';
}

export function SEO({ 
  title, 
  description, 
  path, 
  image = '/og-default.png',
  type = 'website' 
}: SEOProps) {
  const siteUrl = 'https://jcalgoarena.lovable.app';
  const fullUrl = `${siteUrl}${path}`;
  const fullTitle = `${title} | JC AlgoArena`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      
      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={`${siteUrl}${image}`} />
      <meta property="og:site_name" content="JC AlgoArena" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={`${siteUrl}${image}`} />
      
      {/* Canonical */}
      <link rel="canonical" href={fullUrl} />
    </Helmet>
  );
}
