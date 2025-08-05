
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
    fullName: 'AKC Contracting',
    description: 'Professional construction work order management solutions for commercial projects',
    website: 'https://akcllc.com',
    email: 'support@akcllc.com',
    phone: '(817) 846-2101'
  },
  product: {
    name: 'AKC Portal',
    tagline: 'Streamline Your Construction Projects',
    description: 'Professional construction work order management system for commercial projects'
  },
  colors: {
    primary: 'hsl(211, 96%, 45%)', // Professional Blue #0969DA
    secondary: 'hsl(215, 20%, 25%)', // Sophisticated Gray #334155
    accent: 'hsl(158, 64%, 42%)', // Efficiency Green #27A971
    success: 'hsl(158, 64%, 42%)', // Green (same as accent)
    warning: 'hsl(45, 93%, 47%)', // Attention Amber #F59E0B
    destructive: 'hsl(0, 72%, 51%)' // Issue Red #E11D48
  },
  assets: {
    logos: {
      main: '/branding/logos/AKC_logo_fixed_header.png',
      horizontal: '/branding/logos/AKC_logo_fixed_header.png',
      square: '/branding/logos/AKC_logo_fixed_square_512.png',
      compact: '/branding/logos/AKC_logo_fixed_square_512.png',
      light: '/branding/logos/AKC_logo_fixed_header.png',
      dark: '/branding/logos/AKC_logo_fixed_header.png',
      icon: '/branding/logos/AKC_logo_fixed_square_512.png',
      favicon: '/branding/logos/AKC_logo_fixed_square_512.png'
    },
    social: {
      ogImage: '/branding/logos/AKC_logo_fixed_header.png',
      twitterImage: '/branding/logos/AKC_logo_fixed_header.png'
    }
  },
  theme: {
    defaultMode: 'light',
    supportsDarkMode: true
  },
  seo: {
    title: 'AKC Portal - Construction Management by AKC',
    description: 'Professional construction work order management system for commercial projects. Streamline work orders, track progress, and manage subcontractors efficiently.',
    keywords: [
      'construction management',
      'work orders',
      'commercial construction',
      'project management',
      'subcontractor management',
      'AKC construction'
    ],
    author: 'AKC Contracting'
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
