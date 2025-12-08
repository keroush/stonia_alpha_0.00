import { parseSVG } from 'svg-path-parser';

export interface Point {
  x: number;
  y: number;
}

function parsePathData(d: string): Point[] {
  const points: Point[] = [];
  let currentX = 0;
  let currentY = 0;
  let pathStartX = 0;
  let pathStartY = 0;
  
  try {
    const commands = parseSVG(d);
    
    commands.forEach((cmd: any) => {
      // Handle absolute and relative coordinates
      const isAbsolute = cmd.command === cmd.command.toUpperCase();
      let x = 0;
      let y = 0;
      
      if ('x' in cmd && 'y' in cmd) {
        x = isAbsolute ? cmd.x : currentX + cmd.x;
        y = isAbsolute ? cmd.y : currentY + cmd.y;
      } else if ('x' in cmd) {
        x = isAbsolute ? cmd.x : currentX + cmd.x;
        y = currentY;
      } else if ('y' in cmd) {
        x = currentX;
        y = isAbsolute ? cmd.y : currentY + cmd.y;
      }
      
      switch (cmd.command.toUpperCase()) {
        case 'M':
          // Move to - start a new path
          pathStartX = x;
          pathStartY = y;
          currentX = x;
          currentY = y;
          points.push({ x, y });
          break;
        case 'L':
          // Line to
          currentX = x;
          currentY = y;
          points.push({ x, y });
          break;
        case 'C':
        case 'Q':
          // Curve - use end point
          currentX = x;
          currentY = y;
          points.push({ x, y });
          break;
        case 'Z':
          // Close path
          if (points.length > 0) {
            points.push({ x: pathStartX, y: pathStartY });
            currentX = pathStartX;
            currentY = pathStartY;
          }
          break;
        case 'H':
          // Horizontal line
          currentX = x;
          points.push({ x, y: currentY });
          break;
        case 'V':
          // Vertical line
          currentY = y;
          points.push({ x: currentX, y });
          break;
      }
    });
  } catch (error) {
    console.error('Error parsing SVG path:', error);
  }
  
  return points;
}

export function extractPointsFromSVG(svgString: string): Point[] {
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(svgString, 'image/svg+xml');
  
  // Check for parsing errors
  const parserError = svgDoc.querySelector('parsererror');
  if (parserError) {
    console.error('SVG parsing error:', parserError.textContent);
    return [];
  }
  
  const allPoints: Point[] = [];
  
  // Extract points from <path> elements
  const paths = svgDoc.querySelectorAll('path');
  console.log('Found', paths.length, 'path elements');
  
  paths.forEach((path, index) => {
    const d = path.getAttribute('d');
    if (!d) {
      console.warn(`Path ${index} has no 'd' attribute`);
      return;
    }
    
    try {
      const points = parsePathData(d);
      if (points.length > 0) {
        console.log(`Path ${index}: extracted ${points.length} points`);
        allPoints.push(...points);
      } else {
        console.warn(`Path ${index}: no points extracted from d="${d.substring(0, 50)}..."`);
      }
    } catch (error) {
      console.error(`Error parsing path ${index}:`, error);
    }
  });
  
  // If no paths found, try to extract from other elements (polygon, polyline, circle, etc.)
  if (allPoints.length === 0) {
    console.log('No paths found, trying other SVG elements...');
    
    // Try polygons
    const polygons = svgDoc.querySelectorAll('polygon');
    polygons.forEach((polygon) => {
      const pointsAttr = polygon.getAttribute('points');
      if (pointsAttr) {
        const coords = pointsAttr.split(/[\s,]+/).filter(s => s.trim());
        for (let i = 0; i < coords.length - 1; i += 2) {
          const x = parseFloat(coords[i]);
          const y = parseFloat(coords[i + 1]);
          if (!isNaN(x) && !isNaN(y)) {
            allPoints.push({ x, y });
          }
        }
      }
    });
    
    // Try polylines
    const polylines = svgDoc.querySelectorAll('polyline');
    polylines.forEach((polyline) => {
      const pointsAttr = polyline.getAttribute('points');
      if (pointsAttr) {
        const coords = pointsAttr.split(/[\s,]+/).filter(s => s.trim());
        for (let i = 0; i < coords.length - 1; i += 2) {
          const x = parseFloat(coords[i]);
          const y = parseFloat(coords[i + 1]);
          if (!isNaN(x) && !isNaN(y)) {
            allPoints.push({ x, y });
          }
        }
      }
    });
    
    // Try circles (sample points around the circle)
    const circles = svgDoc.querySelectorAll('circle');
    circles.forEach((circle) => {
      const cx = parseFloat(circle.getAttribute('cx') || '0');
      const cy = parseFloat(circle.getAttribute('cy') || '0');
      const r = parseFloat(circle.getAttribute('r') || '0');
      if (!isNaN(cx) && !isNaN(cy) && !isNaN(r) && r > 0) {
        // Sample 32 points around the circle
        for (let i = 0; i < 32; i++) {
          const angle = (i / 32) * 2 * Math.PI;
          allPoints.push({
            x: cx + r * Math.cos(angle),
            y: cy + r * Math.sin(angle),
          });
        }
      }
    });
    
    // Try ellipses
    const ellipses = svgDoc.querySelectorAll('ellipse');
    ellipses.forEach((ellipse) => {
      const cx = parseFloat(ellipse.getAttribute('cx') || '0');
      const cy = parseFloat(ellipse.getAttribute('cy') || '0');
      const rx = parseFloat(ellipse.getAttribute('rx') || '0');
      const ry = parseFloat(ellipse.getAttribute('ry') || '0');
      if (!isNaN(cx) && !isNaN(cy) && !isNaN(rx) && !isNaN(ry) && rx > 0 && ry > 0) {
        // Sample 32 points around the ellipse
        for (let i = 0; i < 32; i++) {
          const angle = (i / 32) * 2 * Math.PI;
          allPoints.push({
            x: cx + rx * Math.cos(angle),
            y: cy + ry * Math.sin(angle),
          });
        }
      }
    });
    
    if (allPoints.length > 0) {
      console.log(`Extracted ${allPoints.length} points from other SVG elements`);
    }
  }
  
  return allPoints;
}

