import { Point } from './svgParser';

/**
 * Generate SVG string from a list of points
 * Creates a path element with the points
 */
export function generateSVGFromPoints(points: Point[], width: number = 800, height: number = 600): string {
  if (points.length === 0) {
    return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"></svg>`;
  }

  // Create path data from points
  let pathData = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    pathData += ` L ${points[i].x} ${points[i].y}`;
  }
  
  // Close the path if first and last points are close
  if (points.length > 2) {
    const first = points[0];
    const last = points[points.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 5) {
      pathData += ' Z';
    }
  }

  const svg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <path d="${pathData}" stroke="black" stroke-width="2" fill="none"/>
</svg>`;

  return svg;
}

