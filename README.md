# Expert Mobile Communications website

Single-page portfolio site for Expert Mobile Communications Ltd. (Canadian Wireless Supply, Inrico Canada, Wirox).

## Folders
- `dist/index.html`: the finished website. One self-contained file (all images built in). Upload this to any host.
- `src/template.html`: the source page (HTML, CSS and JavaScript) with image placeholders like `{{hytera}}`.
- `src/images/`: every image used on the site; `manifest.json` maps each placeholder to its file.
- `src/build.py`: rebuilds `dist/index.html` from the template and images (Python 3, no extra packages).
- `src/cms.js`, `src/cms.css`: the admin panel code (already included inside the template; kept here for reference).
- `firebase.json`, `netlify.toml`: ready-made hosting settings (both publish the `dist` folder).

## Put it online
- **Netlify Drop**: drag the `dist` folder onto https://app.netlify.com/drop
- **GitHub Pages**: upload `dist/index.html` to a public repository, then Settings, Pages, Deploy from branch, main, root.
- **Firebase Hosting**: `npm i -g firebase-tools`, `firebase login`, `firebase use --add` (pick your project), `firebase deploy`.

## Edit the site
1. Change text or layout in `src/template.html`, or replace a picture in `src/images/` (keep the same file name).
2. Run `python3 src/build.py`.
3. Upload the new `dist/index.html`.

## Admin panel note
The Admin button, editing, team management and invite links work only on the claude.ai published page, where Claude provides the login and storage. On other hosts the site shows its built-in content and the admin panel stays hidden. A Firebase backend is needed to run the admin panel on your own domain.

## Contact details used
8701 112 Street, Grande Prairie, AB T8V 6A4. Store +1 (780) 539-3962. CWS 1-877-778-6466, info@cwsupply.ca. Inrico Canada +1 (587) 206-1888, sales@inrico.ca. Hours Mon-Fri 8 AM-5 PM MT.
