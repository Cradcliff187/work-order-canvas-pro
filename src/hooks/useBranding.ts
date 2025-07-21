
import { brandingConfig, getBrandingAsset, getThemeAwareLogo, generateMetaTags, generateManifestData } from '@/config/branding';
import type { BrandingConfig } from '@/config/branding';

export interface BrandingHookReturn {
  config: BrandingConfig;
  company: BrandingConfig['company'];
  product: BrandingConfig['product'];
  colors: BrandingConfig['colors'];
  assets: BrandingConfig['assets'];
  theme: BrandingConfig['theme'];
  seo: BrandingConfig['seo'];
  social: BrandingConfig['social'];
  getAsset: (assetPath: string, fallback?: string) => string;
  getThemeAwareLogo: (theme?: 'light' | 'dark') => string;
  getMetaTags: () => Record<string, string>;
  getManifestData: () => any;
  getProductDisplayName: () => string;
  getCompanyDisplayName: () => string;
  getBrandedTitle: (pageTitle?: string) => string;
}

export function useBranding(): BrandingHookReturn {
  const getProductDisplayName = (): string => {
    return brandingConfig.product.name;
  };

  const getCompanyDisplayName = (): string => {
    return brandingConfig.company.name;
  };

  const getBrandedTitle = (pageTitle?: string): string => {
    const productName = brandingConfig.product.name;
    const companyName = brandingConfig.company.name;
    
    if (pageTitle) {
      return `${pageTitle} - ${productName} | ${companyName}`;
    }
    
    return `${productName} - ${companyName}`;
  };

  return {
    config: brandingConfig,
    company: brandingConfig.company,
    product: brandingConfig.product,
    colors: brandingConfig.colors,
    assets: brandingConfig.assets,
    theme: brandingConfig.theme,
    seo: brandingConfig.seo,
    social: brandingConfig.social,
    getAsset: getBrandingAsset,
    getThemeAwareLogo,
    getMetaTags: generateMetaTags,
    getManifestData: generateManifestData,
    getProductDisplayName,
    getCompanyDisplayName,
    getBrandedTitle
  };
}

// Export individual parts for convenience
export const { 
  company: brandCompany, 
  product: brandProduct, 
  colors: brandColors,
  assets: brandAssets 
} = brandingConfig;
