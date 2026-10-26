# Creative Haider

[Visit Creative Haider — Abdullah Haider's portfolio](https://creativehaider.site/)

Personal portfolio of Abdullah Haider, showcasing web development, UI/UX design, sales closing, and digital projects.

## Pages

- [Home](https://creativehaider.site/)
- [About](https://creativehaider.site/about)
- [Services](https://creativehaider.site/services)
- [Portfolio](https://creativehaider.site/portfolio)
- [Contact](https://creativehaider.site/contact)
- [Privacy Policy](https://creativehaider.site/privacy)
- [Cookie Policy](https://creativehaider.site/cookies)
- [Terms of Service](https://creativehaider.site/terms)

## Performance and SEO

The site uses static HTML, CSS, and JavaScript. Optimized WebP screenshots have 480px and 960px variants, responsive image selection, and lazy loading. Original screenshots remain available. The original layout and visual identity are retained; public motion and accessibility have been refined without changing the dashboard.

`js/image-manifest.js` maps exact existing image URLs to optimized local copies. Dashboard uploads with new URLs continue to display normally; add WebP variants to this manifest when optimizing new uploads. Supabase data, account settings, and Vercel configuration are unchanged.

Public pages include unique titles/descriptions, canonical URLs, social metadata, and JSON-LD. `sitemap.xml` lists the five main pages plus the Privacy, Cookie, and Terms pages; admin pages retain their noindex directives.

After deployment, submit `https://creativehaider.site/sitemap.xml` through the site's Google Search Console property and request indexing of the home page. Search rankings and crawl timing are determined by Google.

Portfolio navigation stays in the current tab. Project links open a verified live URL when available, otherwise the project screenshot. A previously failing Therapeutic Mechanics URL now falls back to its screenshot pending a corrected address.

## Privacy, terms, and tracking

The public site now has `/privacy`, `/cookies`, and `/terms` pages linked from every footer and included in the sitemap. The homepage loads Google Analytics (G-36DZHBQ3N3) only after the visitor chooses “Accept all” in the cookie notice. Choosing “Essential only” leaves the analytics script unloaded. The consent choice is stored in browser local storage. The cookie policy distinguishes the public site from essential admin-session storage. Legal compliance depends on the applicable jurisdiction and should be reviewed for the business’s actual practices.

The contact form stores inquiry details through Supabase. The privacy page describes the fields, purpose, provider, and contact route. Review the posted retention language and legal terms for the business's actual practices before relying on them as legal advice.

## Enhancement audit and checks

See the [21 October follow-up](docs/SITE_FOLLOW_UP.md) for the latest policy, pricing, portfolio-link and owner-confirmation notes. The [13 October enhancement report](docs/ENHANCEMENT_REPORT.md) records the earlier implementation and its measurements; its remaining-issues section is historical. [Machine-readable QA results](docs/qa-results.json) distinguish local lab measurements from production field data.

This is a buildless static site. Run `python tools/validate_public.py` and `node --check js/main.js`, `node --check js/public-data.js`, `node --check js/image-manifest.js` for the included static checks. No production dependencies were added.
