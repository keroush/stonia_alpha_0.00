declare module 'imagetracerjs' {
  interface ImageTracerOptions {
    ltres?: number;
    qtres?: number;
    pathomit?: number;
    colorsampling?: number;
    numberofcolors?: number;
    mincolorratio?: number;
    colorquantcycles?: number;
    scale?: number;
    linefilter?: boolean;
    rightangleenhance?: boolean;
    [key: string]: any;
  }

  interface ImageTracer {
    imagedataToSVG(imageData: ImageData, options?: ImageTracerOptions): string;
    [key: string]: any;
  }

  const ImageTracer: ImageTracer;
  export default ImageTracer;
}

