# Stonia - Sketch to G-Code Converter

A Next.js 14 frontend-only application that converts hand-drawn sketches on a canvas into G-Code files. Everything runs 100% client-side in the browser - no backend required!

## Features

- 🎨 **Interactive Drawing Canvas**: Draw freehand sketches with customizable brush size
- 🖼️ **PNG to SVG Vectorization**: Automatically converts your drawing to vector format
- ⚙️ **G-Code Generation**: Converts vector paths into G-Code for CNC machines
- 💾 **Download G-Code**: Export your generated G-Code as a `.gcode` file

## Tech Stack

- **Next.js 14** with App Router
- **React 18**
- **TailwindCSS** for styling
- **Konva.js** for the drawing canvas
- **imagetracerjs** for PNG → SVG vectorization
- **svg-path-parser** for extracting coordinates from SVG paths

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Draw**: Use your mouse or touchpad to draw on the canvas
2. **Adjust Brush Size**: Use the slider to change the brush size (1-20px)
3. **Clear Canvas**: Click "Clear Canvas" to start over
4. **Generate G-Code**: Click "Generate G-Code" to:
   - Export your drawing as PNG
   - Vectorize it to SVG
   - Extract path coordinates
   - Generate G-Code
   - Download the `.gcode` file

## G-Code Format

The generated G-Code follows this structure:
```
G21          ; Set units to millimeters
G90          ; Set to absolute positioning
G1 F1500     ; Set feed rate
G0 X{x0} Y{y0}  ; Move to start position
M3           ; Start spindle
G1 X{x} Y{y}    ; Draw paths
...
M5           ; Stop spindle
G0 X0 Y0     ; Return to origin
```

## Project Structure

```
stonia/
├── app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main drawing page
│   └── globals.css     # Global styles
├── utils/
│   ├── vectorize.ts    # PNG to SVG vectorization
│   ├── svgParser.ts    # Extract points from SVG paths
│   └── gcodeGenerator.ts # Generate G-Code from points
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Notes

- All processing happens client-side in the browser
- No API routes or server components are used
- The application is fully self-contained

## License

MIT

