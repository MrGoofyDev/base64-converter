# Image to Base64

A browser-based utility for converting image files into Base64 and turning Base64 image data back into downloadable images. The project is a lightweight static website: image conversion happens on the user's device, with no conversion backend or build step.

**Repository:** [github.com/MrGoofyDev/base64-converter](https://github.com/MrGoofyDev/base64-converter)

## Live Website

[https://base64img.pages.dev/](https://base64img.pages.dev/)

## Features

### Image to Base64

- Select an image, drag and drop it, or paste an image from the clipboard where supported.
- Preview the selected file and view its name, type, size, and dimensions.
- Convert automatically when an image is selected, or use **Convert to Base64** to re-convert it.
- Copy the result as a Data URI, raw Base64, an HTML `<img>` element, or a CSS background image.
- Supports PNG, JPEG, GIF, WebP, SVG, BMP, ICO, and AVIF files up to 20 MB. Preview support depends on the browser.

### Base64 to Image

- Paste a Base64 Data URI or raw Base64 text.
- Select an image type when the input is raw Base64 without MIME information.
- Validate and preview decoded image data, then download it as a local file.

### Privacy and implementation

- Image selection, encoding, decoding, preview, and download use browser APIs on the device.
- The converter does not upload image data to a conversion server.
- The site uses HTML, CSS, and vanilla JavaScript; it has no required packages, framework, backend, or build process.
- Reserved advertisement containers are placeholders only. Add your own authorized ad provider code if you choose to enable advertising.

## Technology

- HTML5 semantic pages
- CSS3 responsive layout
- Vanilla JavaScript and browser APIs, including `FileReader`, `Blob`, object URLs, and the Clipboard API where available
- SVG branding and icons
- Cloudflare Pages-compatible clean URLs and static headers

## Project structure

```text
.
├── index.html              # Converter and informational content
├── about.html              # About the tool
├── privacy.html            # Privacy policy
├── contact.html            # Contact and advertising inquiries
├── app.js                  # Client-side converter
├── styles.css              # Shared responsive styles
├── assets/
│   ├── logo.svg
│   ├── favicon.svg
│   ├── favicon-16.png
│   ├── favicon-32.png
│   ├── apple-touch-icon.png
│   ├── android-chrome-192.png
│   └── android-chrome-512.png
├── _headers                # Static security-related and JSON response headers
├── llms.txt                # Agent-readable site and feature overview
├── ai-catalog.json         # AI Catalog resource discovery document
├── .well-known/
│   └── ai-catalog.json     # Standard well-known AI Catalog endpoint
├── site.webmanifest
├── robots.txt
├── sitemap.xml
├── LICENSE                 # Custom personal-use license
└── README.md
```

## Run locally

No dependencies or compilation are required. Serve the project root with any static file server, then open its local address in a browser. For example, with Python installed:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Cloudflare Pages serves `about.html`, `privacy.html`, and `contact.html` at their extensionless clean URLs automatically. A simple local static server may require `/about.html`, `/privacy.html`, and `/contact.html` instead.

## Browser compatibility

Use a modern browser with support for the File API, `Blob`, object URLs, and `atob`. Clipboard image paste and clipboard writing depend on browser support and permissions; clipboard APIs generally require a secure context such as HTTPS or localhost. Image preview and AVIF support can vary by browser. The converter accepts files up to 20 MB.

## Deploy to Cloudflare Pages

This repository can be deployed as a static site without a build command:

1. Create a Cloudflare Pages project and connect `MrGoofyDev/base64-converter`, using the `main` branch.
2. Select **None** (or the static/no-framework option) for the framework preset.
3. Leave the build command empty and set the build output directory to `.` (the repository root).
4. Deploy. Cloudflare Pages serves the extensionless page routes from the corresponding `.html` files and reads `_headers` from the published root.
5. The canonical, Open Graph, Twitter/X, structured-data, `robots.txt`, and sitemap URLs are configured for [https://base64img.pages.dev/](https://base64img.pages.dev/). Update them together only if the production domain changes.

You can also publish the static project root with a compatible direct-upload workflow; no server-side runtime is needed.

## Source code

Repository: [https://github.com/MrGoofyDev/base64-converter](https://github.com/MrGoofyDev/base64-converter)

## License and copyright

Copyright © 2026 MrGoofyDev. All rights reserved, except for the limited private-use permission described in [`LICENSE`](LICENSE).

The project is **not** offered under an open-source license. Private learning, local study, and personal experimentation are permitted under the terms of the custom license. Written permission from MrGoofyDev is required before publicly publishing, publicly hosting, or publicly redistributing this project or modified/derivative versions. See [`LICENSE`](LICENSE) for the full terms.
