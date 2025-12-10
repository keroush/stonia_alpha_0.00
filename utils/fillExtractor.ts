import { Point } from './svgParser';

/**
 * Extract boundary points from a filled area image
 * Uses contour tracing to find the outline of filled regions
 */
export async function extractFillBoundary(imageDataUrl: string): Promise<Point[]> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve([]);
        return;
      }

      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const width = imageData.width;
      const height = imageData.height;

      // Find filled pixels (non-transparent, non-white)
      const filledPixels = new Set<string>();
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;
          const r = data[idx];
          const g = data[idx + 1];
          const b = data[idx + 2];
          const a = data[idx + 3];
          
          // Check if pixel is filled (not white/transparent)
          if (a > 0 && !(r === 255 && g === 255 && b === 255)) {
            filledPixels.add(`${x},${y}`);
          }
        }
      }

      if (filledPixels.size === 0) {
        resolve([]);
        return;
      }

      // Find boundary pixels (filled pixels with at least one empty neighbor)
      const boundaryPixels: Point[] = [];
      const boundarySet = new Set<string>();

      const isFilled = (x: number, y: number): boolean => {
        if (x < 0 || x >= width || y < 0 || y >= height) return false;
        return filledPixels.has(`${x},${y}`);
      };

      const hasEmptyNeighbor = (x: number, y: number): boolean => {
        const neighbors = [
          [x - 1, y],
          [x + 1, y],
          [x, y - 1],
          [x, y + 1],
        ];
        return neighbors.some(([nx, ny]) => !isFilled(nx, ny));
      };

      // Find all boundary pixels (edge pixels of filled regions)
      filledPixels.forEach((key) => {
        const [x, y] = key.split(',').map(Number);
        if (hasEmptyNeighbor(x, y)) {
          const pointKey = `${x},${y}`;
          if (!boundarySet.has(pointKey)) {
            boundarySet.add(pointKey);
            boundaryPixels.push({ x, y });
          }
        }
      });

      if (boundaryPixels.length === 0) {
        resolve([]);
        return;
      }

      // Sort boundary pixels to create a continuous path
      const sortedBoundary = sortBoundaryPixels(boundaryPixels);
      
      resolve(sortedBoundary);
    };
    img.onerror = () => resolve([]);
    img.src = imageDataUrl;
  });
}

/**
 * Sort boundary pixels to create a continuous path
 * Uses nearest neighbor approach with 8-directional connectivity
 */
function sortBoundaryPixels(pixels: Point[]): Point[] {
  if (pixels.length === 0) return [];
  if (pixels.length === 1) return pixels;

  const sorted: Point[] = [];
  const remaining = new Set(pixels.map(p => `${p.x},${p.y}`));
  
  // Start with first pixel
  let current = pixels[0];
  sorted.push(current);
  remaining.delete(`${current.x},${current.y}`);

  while (remaining.size > 0) {
    let nearest: Point | null = null;
    let minDist = Infinity;

    // Check 8-directional neighbors first (adjacent and diagonal)
    const directions = [
      [-1, -1], [0, -1], [1, -1],
      [-1, 0],           [1, 0],
      [-1, 1],  [0, 1],  [1, 1],
    ];

    // First try to find adjacent neighbors (distance <= sqrt(2))
    for (const [dx, dy] of directions) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      const key = `${nx},${ny}`;
      
      if (remaining.has(key)) {
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < minDist) {
          minDist = dist;
          nearest = { x: nx, y: ny };
        }
      }
    }

    if (nearest) {
      sorted.push(nearest);
      remaining.delete(`${nearest.x},${nearest.y}`);
      current = nearest;
    } else {
      // If no adjacent neighbor, find the closest remaining pixel
      let foundNearest: Point | null = null;
      for (const key of Array.from(remaining)) {
        const [x, y] = key.split(',').map(Number);
        const point: Point = { x, y };
        const dx = point.x - current.x;
        const dy = point.y - current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < minDist) {
          minDist = dist;
          foundNearest = point;
        }
      }

      if (foundNearest) {
        sorted.push(foundNearest);
        remaining.delete(`${foundNearest.x},${foundNearest.y}`);
        current = foundNearest;
      } else {
        break;
      }
    }
  }

  // Close the path by connecting last point to first if they're close
  if (sorted.length > 2) {
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const dx = last.x - first.x;
    const dy = last.y - first.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist <= Math.sqrt(2)) {
      sorted.push({ ...first }); // Close the loop
    }
  }

  return sorted;
}

