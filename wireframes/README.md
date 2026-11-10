# Design Samples (Dummy Files)

Example files showing the formats you will meet when working with Figma.

## figma-source/ (Figma-native files)
These are PLACEHOLDERS. They will not open in Figma.
- sample.fig     : a Figma design file
- sample.figjam  : a FigJam whiteboard file
- sample.deck    : a Figma Slides file

## exports/ (what developers actually use)
- sample-logo.svg   : vector graphic, scales without losing quality (icons, logos)
- sample-screen.png : image with transparency support (UI screenshots)
- sample-screen.jpg : smaller compressed image (photos)

## Where they go in the Next.js project
- Export assets (svg, png, jpg) -> public/
- Source files (.fig etc.)      -> keep in this design folder or in Figma cloud, not in app/ or lib/
