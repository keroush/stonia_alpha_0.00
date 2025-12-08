import { Point } from './svgParser';
import { extractFillBoundary } from './fillExtractor';

/**
 * Check if two points are very close to each other
 */
function arePointsClose(p1: Point, p2: Point, threshold: number = 0.5): boolean {
  const dx = Math.abs(p1.x - p2.x);
  const dy = Math.abs(p1.y - p2.y);
  return dx < threshold && dy < threshold;
}

/**
 * Extract points directly from Konva lines array
 * Now only extracts points from fill operations (bucket tool)
 * Each line has points in format [x1, y1, x2, y2, x3, y3, ...]
 * Optimizes by removing duplicate consecutive points within each line
 */
export async function extractPointsFromLines(lines: any[]): Promise<Point[]> {
  const allPoints: Point[] = [];
  
  // Process all fill operations first
  const fillPromises = lines
    .filter((line) => line.type === 'fill' && line.imageData)
    .map((line) => extractFillBoundary(line.imageData));

  const fillBoundaries = await Promise.all(fillPromises);
  
  // Add all fill boundary points
  fillBoundaries.forEach((boundary) => {
    allPoints.push(...boundary);
  });
  
  // Skip all other line types (pen, line, eraser) - only use fills
  // lines.forEach((line) => {
  //   // Skip eraser - they shouldn't be included in G-Code
  //   if (line.type === 'eraser') {
  //     return;
  //   }
    
  //   // Skip non-fill lines - only process fills
  //   if (line.type !== 'fill') {
  //     return;
  //   }
    
  //   if (!line.points || !Array.isArray(line.points) || line.points.length < 2) {
  //     return;
  //   }
    
  //   // Konva lines store points as [x1, y1, x2, y2, ...]
  //   // Convert to [{x, y}, {x, y}, ...] and remove duplicates within the line
  //   const linePoints: Point[] = [];
  //   for (let i = 0; i < line.points.length; i += 2) {
  //     if (i + 1 < line.points.length) {
  //       const point: Point = {
  //         x: line.points[i],
  //         y: line.points[i + 1],
  //       };
        
  //       // Only add if it's different from the last point in this line
  //       if (linePoints.length === 0 || !arePointsClose(linePoints[linePoints.length - 1], point)) {
  //         linePoints.push(point);
  //       }
  //     }
  //   }
    
  //   // Add line points to all points
  //   allPoints.push(...linePoints);
  // });
  
  return allPoints;
}

