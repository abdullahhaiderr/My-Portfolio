# Creative Haider

[Visit Creative Haider — Abdullah Haider's portfolio](https://creativehaider.vercel.app/)

Personal portfolio of Abdullah Haider, showcasing web development, UI/UX design, sales closing, and digital projects.

## Pages

- [Home](https://creativehaider.vercel.app/)
- [About](https://creativehaider.vercel.app/about)
- [Services](https://creativehaider.vercel.app/services)
- [Portfolio](https://creativehaider.vercel.app/portfolio)
- [Contact](https://creativehaider.vercel.app/contact)

## Performance and SEO

The site uses static HTML, CSS, and JavaScript. Optimized WebP screenshots have 480px and 960px variants, responsive image selection, and lazy loading. Original screenshots remain available. Layout, colors, typography, and existing animations are preserved.

`js/image-manifest.js` maps exact existing image URLs to optimized local copies. Dashboard uploads with new URLs continue to display normally; add WebP variants to this manifest when optimizing new uploads. Supabase data, account settings, and Vercel configuration are unchanged.

Public pages include unique titles/descriptions, canonical URLs, social metadata, and JSON-LD. `sitemap.xml` lists the five public pages; admin pages retain their noindex directives.

After deployment, submit `https://creativehaider.vercel.app/sitemap.xml` through the site's Google Search Console property and request indexing of the home page. Search rankings and crawl timing are determined by Google.

Portfolio navigation opens in a new tab. Project links open their live URL when available, otherwise their optimized screenshot.
