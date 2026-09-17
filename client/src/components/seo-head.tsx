import { useEffect } from 'react';

interface SEOHeadProps {
    title: string;
    description: string;
    keywords?: string;
    canonicalUrl?: string;
    ogImage?: string;
    structuredData?: object;
}

export function SEOHead({ title, description, keywords, canonicalUrl, ogImage, structuredData }: SEOHeadProps) {
    useEffect(() => {
        // Determine suffix
        const fullTitle = title.includes('HexaSend')
            ? title
            : `${title} | HexaSend`;

        document.title = fullTitle;

        // Default metadata elements
        const metaTags: Record<string, string> = {
            description,
            'twitter:title': fullTitle,
            'twitter:description': description,
            'og:title': fullTitle,
            'og:description': description,
        };

        if (keywords) {
            metaTags['keywords'] = keywords;
        }

        if (ogImage) {
            metaTags['og:image'] = ogImage;
            metaTags['twitter:image'] = ogImage;
        }

        if (canonicalUrl) {
            metaTags['og:url'] = canonicalUrl;
            metaTags['twitter:url'] = canonicalUrl;
        }

        // Apply metadata
        Object.entries(metaTags).forEach(([name, content]) => {
            // Handle standard meta names vs open graph properties
            const isOg = name.startsWith('og:');
            const selector = isOg
                ? `meta[property="${name}"]`
                : `meta[name="${name}"]`;

            let el = document.querySelector(selector);

            if (!el) {
                el = document.createElement('meta');
                if (isOg) {
                    el.setAttribute('property', name);
                } else {
                    el.setAttribute('name', name);
                }
                document.head.appendChild(el);
            }

            el.setAttribute('content', content);
        });

        // Canonical Tag
        if (canonicalUrl) {
            let canonicalEl = document.querySelector('link[rel="canonical"]');
            if (!canonicalEl) {
                canonicalEl = document.createElement('link');
                canonicalEl.setAttribute('rel', 'canonical');
                document.head.appendChild(canonicalEl);
            }
            canonicalEl.setAttribute('href', canonicalUrl);
        }

        // Structured Data (JSON-LD)
        let scriptEl = document.getElementById('dynamic-schema-script');
        if (structuredData) {
            if (!scriptEl) {
                scriptEl = document.createElement('script');
                scriptEl.id = 'dynamic-schema-script';
                scriptEl.setAttribute('type', 'application/ld+json');
                document.head.appendChild(scriptEl);
            }
            scriptEl.textContent = JSON.stringify(structuredData);
        } else if (scriptEl) {
            scriptEl.remove();
        }

        // Cleanup isn't strictly necessary as the next page will overwrite,
        // but we leave this here as standard React practice
        return () => { };
    }, [title, description, keywords, canonicalUrl, ogImage, structuredData]);

    return null;
}
