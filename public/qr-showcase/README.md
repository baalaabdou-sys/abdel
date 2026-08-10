# Custom QR design examples

Drop image files here, then point at them from `data/qrShowcase.ts`.

1. Add the file, e.g. `cafe-menu-poster.jpg`
2. In `data/qrShowcase.ts`, set that entry's `image`:

   image: "/qr-showcase/cafe-menu-poster.jpg"

Entries left as `image: null` render a styled placeholder tile, so the
gallery still looks intentional until real artwork is added.

Suggested: landscape 4:3, at least 1200px wide, JPG or WebP.
