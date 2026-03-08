import { useEffect } from 'react';

interface SEOHeadProps {
    title: string;
    description: string;
    keywords?: string;
}

export function SEOHead({ title, description, keywords }: SEOHeadProps) {
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

        // Cleanup isn't strictly necessary as the next page will overwrite,
        // but we leave this here as standard React practice
        return () => { };
    }, [title, description, keywords]);

    return null;
}
