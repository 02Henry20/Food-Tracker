# Ascend App Icon Pack

Production-ready icon assets generated from the selected design 1 emblem.

## Folders

- `icons/icon-*x*.png` — standard square app icons with a dark navy/charcoal background.
- `icons/android-circle-*x*.png` — round/circle Android launcher variants, visually optimized rather than simply clipped.
- `icons/maskable-*x*.png` — Android PWA maskable icons with extra safe padding.
- `icons/apple-touch-icon.png` — 180x180 Apple touch icon.
- `favicons/favicon.ico` — browser favicon bundle containing 16x16, 32x32 and 48x48 sizes.
- `favicons/favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png` — transparent-background browser favicon PNGs.
- `manifest.webmanifest` — PWA manifest configured for Ascend.
- `head-snippet.html` — copyable `<head>` tags for the manifest, favicon files and Apple touch icon.
- `source-emblem-transparent.png` — transparent isolated emblem used to build the pack.

## Notes

- Normal app icons use a dark navy/charcoal background to match a dark, game-like UI.
- Browser favicon PNGs and ICO use a transparent background.
- Maskable icons intentionally keep the emblem smaller so Android launchers do not crop it.
- The manifest lists Android circle icons first, then maskable icons, then standard icons, so launchers have strong options available.
