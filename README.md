# Image to Base64

A static, browser-only image/Base64 converter. Deploy the project root directly to Cloudflare Pages with no build command or backend.

## Pages and assets

- `/`, `/about`, `/privacy`, and `/contact` are the public routes. `_redirects` maps the extensionless information routes to their HTML files.
- `styles.css` and `app.js` contain the shared interface and local converter.
- `assets/` contains the logo and favicon files.
- Empty labeled ad slots in `index.html` are reserved for your Adsterra code.

Before launch, replace `YOUR-DOMAIN.example` in `robots.txt` and `sitemap.xml` with the production hostname. Canonical and Open Graph URLs are root-relative so they resolve on the deployed hostname without assuming a domain.

The converter keeps selected and pasted image data in the browser. The privacy policy describes the possible behavior of third-party advertising providers; review it if advertising or provider configuration changes.
