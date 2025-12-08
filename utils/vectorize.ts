// Using imagetracerjs for browser-compatible vectorization
let ImageTracerInstance: any = null;

async function loadImageTracer() {
  if (ImageTracerInstance) return ImageTracerInstance;
  
  // Dynamic import for browser compatibility
  // imagetracerjs exports: module.exports = new ImageTracer()
  const module = await import('imagetracerjs');
  // The module exports an ImageTracer instance directly
  ImageTracerInstance = module.default || module;
  return ImageTracerInstance;
}

export async function vectorizePNGToSVG(pngDataUrl: string): Promise<string> {
  const tracer = await loadImageTracer();
  
  // Convert data URL to Image
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Trace image to SVG - imagetracerjs API
        // Adjusted options to better capture hand-drawn sketches
        const options = {
          ltres: 1,              // Line threshold
          qtres: 1,              // Quadratic threshold
          pathomit: 8,           // Path omit (smaller = more detail)
          colorsampling: 0,       // Color sampling
          numberofcolors: 2,     // Number of colors (2 for black/white)
          mincolorratio: 0,      // Minimum color ratio
          colorquantcycles: 1,   // Color quantization cycles
          scale: 1,              // Scale
          linefilter: false,     // Line filter
          rightangleenhance: false, // Right angle enhancement
          viewbox: false,        // Viewbox
          desc: false,           // Description
        };
        
        // imagetracerjs API: ImageTracer.imagedataToSVG(imageData, options)
        // The module exports an ImageTracer instance, so we call methods directly on it
        let svgString: string;
        try {
          if (!tracer || typeof tracer !== 'object') {
            throw new Error('ImageTracer instance is not available');
          }
          
          // The tracer is an ImageTracer instance with imagedataToSVG method
          if (typeof tracer.imagedataToSVG === 'function') {
            svgString = tracer.imagedataToSVG(imageData, options);
          } else {
            // Debug: log what we actually got
            console.error('Tracer object:', tracer);
            console.error('Tracer type:', typeof tracer);
            if (tracer && typeof tracer === 'object') {
              console.error('Tracer keys:', Object.keys(tracer));
            }
            throw new Error(`imagedataToSVG method not found. Available methods: ${Object.keys(tracer || {}).join(', ')}`);
          }
          
          if (!svgString || typeof svgString !== 'string') {
            throw new Error('imagedataToSVG did not return a valid SVG string');
          }
          
          resolve(svgString);
        } catch (traceError: any) {
          console.error('Error during image tracing:', traceError);
          reject(new Error(`Image tracing failed: ${traceError.message}`));
        }
      } catch (error: any) {
        reject(new Error(`Vectorization error: ${error.message}`));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = pngDataUrl;
  });
}

