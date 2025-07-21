
export interface BrandingConfig {
  company: {
    name: string;
    fullName: string;
    description: string;
    website: string;
    email: string;
    phone?: string;
  };
  product: {
    name: string;
    tagline: string;
    description: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    destructive: string;
  };
  assets: {
    logos: {
      main: string;
      horizontal: string;
      square: string;
      compact: string;
      light: string;
      dark: string;
      icon: string;
      favicon: string;
    };
    social: {
      ogImage: string;
      twitterImage: string;
    };
  };
  theme: {
    defaultMode: 'light' | 'dark';
    supportsDarkMode: boolean;
  };
  seo: {
    title: string;
    description: string;
    keywords: string[];
    author: string;
  };
  social: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

export const brandingConfig: BrandingConfig = {
  company: {
    name: 'AKC',
    fullName: 'AKC Construction Services',
    description: 'Professional construction work order management solutions for commercial projects',
    website: 'https://akc-construction.com',
    email: 'info@akc-construction.com',
    phone: '+1 (555) 123-4567'
  },
  product: {
    name: 'WorkOrderPortal',
    tagline: 'Streamline Your Construction Projects',
    description: 'Professional construction work order management system for commercial projects'
  },
  colors: {
    primary: 'hsl(210, 100%, 50%)', // AKC Blue #0080FF
    secondary: 'hsl(210, 10%, 96%)', // Clean Gray
    accent: 'hsl(210, 95%, 96%)', // Light Blue
    success: 'hsl(142, 71%, 45%)', // Green
    warning: 'hsl(38, 100%, 50%)', // Orange
    destructive: 'hsl(0, 84%, 60%)' // Red
  },
  assets: {
    logos: {
      main: '/branding/logos/akc-logo-horizontal.png',
      horizontal: '/branding/logos/akc-logo-horizontal.png',
      square: '/branding/logos/akc-logo-square.png',
      compact: '/branding/logos/akc-logo-compact.png',
      light: '/branding/logos/akc-logo-horizontal.png',
      dark: '/branding/logos/akc-logo-horizontal.png',
      icon: '/branding/logos/akc-logo-square.png',
      favicon: '/branding/favicons/favicon.png'
    },
    social: {
      ogImage: '/branding/social/og-image.png',
      twitterImage: '/branding/social/twitter-image.png'
    }
  },
  theme: {
    defaultMode: 'light',
    supportsDarkMode: true
  },
  seo: {
    title: 'WorkOrderPortal - Construction Management by AKC',
    description: 'Professional construction work order management system for commercial projects. Streamline work orders, track progress, and manage subcontractors efficiently.',
    keywords: [
      'construction management',
      'work orders',
      'commercial construction',
      'project management',
      'subcontractor management',
      'AKC construction'
    ],
    author: 'AKC Construction Services'
  },
  social: {
    linkedin: 'https://linkedin.com/company/akc-construction',
    twitter: 'https://twitter.com/akc_construction'
  }
};

// Helper functions for branding
export const getBrandingAsset = (assetPath: string, fallback?: string): string => {
  return assetPath || fallback || '';
};

export const getThemeAwareLogo = (theme: 'light' | 'dark' = 'light'): string => {
  return theme === 'dark' ? brandingConfig.assets.logos.dark : brandingConfig.assets.logos.light;
};

export const generateMetaTags = () => {
  const { seo, company, product, assets } = brandingConfig;
  
  return {
    title: seo.title,
    description: seo.description,
    keywords: seo.keywords.join(', '),
    author: seo.author,
    'og:title': `${product.name} - ${company.name}`,
    'og:description': seo.description,
    'og:image': assets.social.ogImage,
    'og:type': 'website',
    'twitter:card': 'summary_large_image',
    'twitter:title': product.name,
    'twitter:description': product.tagline,
    'twitter:image': assets.social.twitterImage
  };
};

export const generateManifestData = () => {
  const { product, company, colors, assets } = brandingConfig;
  
  return {
    name: `${product.name} - ${company.name}`,
    short_name: product.name,
    description: product.description,
    theme_color: colors.primary,
    background_color: '#ffffff',
    icons: [
      {
        src: '/branding/favicons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/branding/favicons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any'
      },
      {
        src: '/branding/favicons/icon-maskable.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable'
      }
    ]
  };
};
