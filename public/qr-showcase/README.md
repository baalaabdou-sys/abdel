# Custom QR design examples

Drop image files here, then point at them from `data/qrShowcase.ts`.

1. Add the file, e.g. `example.jpg`
2. In `data/qrShowcase.ts`, set that entry's `image`:

   image: "/qr-showcase/example.jpg"

Entries left as `image: null` render a styled placeholder tile, so the
gallery still looks intentional until real artwork is added.

Suggested: landscape/square, ~1100px on the long edge, JPG at ~80-85
quality — keeps each file well under 250KB without visible loss.
