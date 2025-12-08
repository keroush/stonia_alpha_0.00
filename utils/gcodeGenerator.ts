import { Point } from './svgParser';

/**
 * Remove duplicate or very close points to optimize G-Code
 * @param points Array of points
 * @param minDistance Minimum distance in pixels to consider points different (default: 0.5)
 */
function removeDuplicatePoints(points: Point[], minDistance: number = 0.5): Point[] {
  if (points.length === 0) return [];
  
  const optimized: Point[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const prev = optimized[optimized.length - 1];
    const curr = points[i];
    const dx = curr.x - prev.x;
    const dy = curr.y - prev.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    // Only add point if it's far enough from the previous one
    if (distance >= minDistance) {
      optimized.push(curr);
    }
  }
  
  return optimized;
}

/**
 * Check if two points are the same (within tolerance)
 */
function pointsAreEqual(p1: Point, p2: Point, tolerance: number = 0.1): boolean {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);
  return dx < tolerance && dy < tolerance;
}

/**
 * Remove redundant points that would create zero-length movements
 * @param points Array of points
 */
function removeRedundantPoints(points: Point[]): Point[] {
  if (points.length <= 1) return points;
  
  const filtered: Point[] = [points[0]];
  
  for (let i = 1; i < points.length; i++) {
    const prev = filtered[filtered.length - 1];
    const curr = points[i];
    
    // Skip if point is the same as previous
    if (!pointsAreEqual(prev, curr)) {
      filtered.push(curr);
    }
  }
  
  return filtered;
}

/**
 * Generate G-Code from a list of points
 * @param points Array of coordinate points
 * @param feedRate Feed rate for G1 movements (default: 1500)
 * @param scale Scale factor to convert pixels to millimeters (default: 0.1, meaning 1px = 0.1mm)
 * @param flipY Whether to flip Y coordinates (default: true, for machines where Y increases upward)
 * @param canvasWidth Canvas width in pixels (for aspect ratio scaling)
 * @param canvasHeight Canvas height in pixels (for aspect ratio scaling)
 */
export function generateGCode(
  points: Point[],
  feedRate: number = 1500,
  scale: number = 0.1,
  flipY: boolean = true,
  canvasWidth?: number,
  canvasHeight?: number
): string {
  if (points.length === 0) {
    return '';
  }

  // Optimize points: remove duplicates and very close points
  let optimizedPoints = removeRedundantPoints(points);
  optimizedPoints = removeDuplicatePoints(optimizedPoints, 0.5);
  
  if (optimizedPoints.length === 0) {
    return '';
  }

  const lines: string[] = [];
  
  // Find max Y for flipping
  const maxY = Math.max(...optimizedPoints.map(p => p.y));
  
  // Calculate Y scale if canvas dimensions provided (maintain aspect ratio)
  let yScale = scale;
  if (canvasWidth && canvasHeight) {
    // Scale Y proportionally to maintain aspect ratio
    yScale = scale * (canvasHeight / canvasWidth);
  }
  
  // Header
  lines.push('G21'); // Set units to millimeters
  lines.push('G90'); // Set to absolute positioning
  lines.push(`G1 F${feedRate}`); // Set feed rate
  
  // Scale and optionally flip coordinates
  const scalePoint = (point: Point): Point => {
    let y = point.y * yScale;
    if (flipY) {
      y = (maxY * yScale) - y;
    }
    return {
      x: point.x * scale,
      y: y,
    };
  };
  
  // Move to start position
  const firstPoint = scalePoint(optimizedPoints[0]);
  lines.push(`G0 X${firstPoint.x.toFixed(3)} Y${firstPoint.y.toFixed(3)}`);
  
  // Start spindle (M3)
  lines.push('M3');
  
  // Draw all points, skipping if movement would be zero
  let lastScaledPoint = firstPoint;
  for (let i = 1; i < optimizedPoints.length; i++) {
    const point = scalePoint(optimizedPoints[i]);
    
    // Only add command if point is different from last point
    const dx = Math.abs(point.x - lastScaledPoint.x);
    const dy = Math.abs(point.y - lastScaledPoint.y);
    
    if (dx > 0.001 || dy > 0.001) {
      lines.push(`G1 X${point.x.toFixed(3)} Y${point.y.toFixed(3)}`);
      lastScaledPoint = point;
    }
  }
  
  // Stop spindle (M5)
  lines.push('M5');
  
  // Return to origin
  lines.push('G0 X0 Y0');
  
  return lines.join('\n');
}

