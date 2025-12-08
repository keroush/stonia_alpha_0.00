'use client';

import { useRef, useState, useEffect } from 'react';

type Tool = 'pen' | 'line' | 'eraser' | 'bucket';

interface DrawingCanvasProps {
  lines: any[];
  setLines: (lines: any[]) => void;
  brushSize: number;
  isDrawing: boolean;
  setIsDrawing: (isDrawing: boolean) => void;
  tool: Tool;
  fillColor: string;
  backgroundImage: string | null;
  stageRef: React.RefObject<any>;
  canvasSize: number; // Canvas size in meters
}

export default function DrawingCanvas({
  lines,
  setLines,
  brushSize,
  isDrawing,
  setIsDrawing,
  tool,
  fillColor,
  backgroundImage,
  stageRef,
  canvasSize,
}: DrawingCanvasProps) {
  const [isClient, setIsClient] = useState(false);
  const [KonvaComponents, setKonvaComponents] = useState<any>(null);
  const [tempLine, setTempLine] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [lineAngle, setLineAngle] = useState<number | null>(null);
  const [lineLength, setLineLength] = useState<number | null>(null);
  const [distanceToLeft, setDistanceToLeft] = useState<number | null>(null);
  const [distanceToTop, setDistanceToTop] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [fillImages, setFillImages] = useState<Map<number, HTMLImageElement>>(new Map());
  const fillImagesRef = useRef<Map<number, HTMLImageElement>>(new Map());
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import react-konva only on client side
    import('react-konva').then((mod) => {
      setKonvaComponents(mod);
    });
  }, []);

  // Load fill images
  useEffect(() => {
    lines.forEach((line, i) => {
      if (line.type === 'fill' && line.imageData && !fillImagesRef.current.has(i)) {
        const img = new window.Image();
        img.onload = () => {
          fillImagesRef.current.set(i, img);
          setFillImages((prev) => {
            const updated = new Map(prev);
            updated.set(i, img);
            return updated;
          });
        };
        img.src = line.imageData;
      }
    });
  }, [lines]);

  // Load background image
  useEffect(() => {
    if (backgroundImage) {
      const img = new window.Image();
      img.onload = () => {
        setBgImage(img);
      };
      img.src = backgroundImage;
    } else {
      setBgImage(null);
    }
  }, [backgroundImage]);

  const calculateAngle = (startX: number, startY: number, endX: number, endY: number): number => {
    const dx = endX - startX;
    const dy = endY - startY;
    const angleRad = Math.atan2(dy, dx);
    const angleDeg = (angleRad * 180) / Math.PI;
    // Normalize to 0-360 range
    return angleDeg < 0 ? angleDeg + 360 : angleDeg;
  };

  // Flood fill algorithm
  const floodFill = (stage: any, startX: number, startY: number, fillColor: string) => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw current canvas state to temporary canvas
    const stageCanvas = stage.toCanvas();
    ctx.drawImage(stageCanvas, 0, 0);

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert fill color to RGB
    const hexToRgb = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
          }
        : { r: 0, g: 0, b: 0 };
    };

    const fillRgb = hexToRgb(fillColor);
    const targetR = data[((Math.floor(startY) * width + Math.floor(startX)) * 4)];
    const targetG = data[((Math.floor(startY) * width + Math.floor(startX)) * 4) + 1];
    const targetB = data[((Math.floor(startY) * width + Math.floor(startX)) * 4) + 2];
    const targetA = data[((Math.floor(startY) * width + Math.floor(startX)) * 4) + 3];

    // Check if already filled
    if (
      targetR === fillRgb.r &&
      targetG === fillRgb.g &&
      targetB === fillRgb.b
    ) {
      return;
    }

    // Flood fill using stack-based approach
    const stack: [number, number][] = [[Math.floor(startX), Math.floor(startY)]];
    const visited = new Set<string>();

    const setPixel = (x: number, y: number) => {
      const idx = (y * width + x) * 4;
      data[idx] = fillRgb.r;
      data[idx + 1] = fillRgb.g;
      data[idx + 2] = fillRgb.b;
      data[idx + 3] = 255;
    };

    const getPixel = (x: number, y: number) => {
      if (x < 0 || x >= width || y < 0 || y >= height) return null;
      const idx = (y * width + x) * 4;
      return {
        r: data[idx],
        g: data[idx + 1],
        b: data[idx + 2],
        a: data[idx + 3],
      };
    };

    const matchesTarget = (pixel: { r: number; g: number; b: number; a: number } | null) => {
      if (!pixel) return false;
      // Match if similar color (within tolerance) or if it's white/transparent
      const tolerance = 10;
      return (
        (Math.abs(pixel.r - targetR) < tolerance &&
          Math.abs(pixel.g - targetG) < tolerance &&
          Math.abs(pixel.b - targetB) < tolerance) ||
        (pixel.r === 255 && pixel.g === 255 && pixel.b === 255) // White background
      );
    };

    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;

      if (visited.has(key)) continue;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;

      const pixel = getPixel(x, y);
      if (!pixel || !matchesTarget(pixel)) continue;

      visited.add(key);
      setPixel(x, y);

      // Add neighbors
      stack.push([x + 1, y]);
      stack.push([x - 1, y]);
      stack.push([x, y + 1]);
      stack.push([x, y - 1]);
    }

    // Create a mask canvas with only the filled area
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = width;
    maskCanvas.height = height;
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) return;

    // Create image data for mask (only filled pixels)
    const maskImageData = maskCtx.createImageData(width, height);
    const maskData = maskImageData.data;

    // Mark filled pixels in mask
    visited.forEach((key) => {
      const [x, y] = key.split(',').map(Number);
      const idx = (y * width + x) * 4;
      maskData[idx] = fillRgb.r;
      maskData[idx + 1] = fillRgb.g;
      maskData[idx + 2] = fillRgb.b;
      maskData[idx + 3] = 255;
    });

    maskCtx.putImageData(maskImageData, 0, 0);

    const fillShape = {
      type: 'fill',
      imageData: maskCanvas.toDataURL(),
      color: fillColor,
      x: 0,
      y: 0,
      width: width,
      height: height,
    };

    return fillShape;
  };

  const handleMouseDown = (e: any) => {
    const pos = e.target.getStage().getPointerPosition();
    const stage = e.target.getStage();
    
    if (tool === 'pen') {
      setIsDrawing(true);
      setLines([...lines, { points: [pos.x, pos.y], brushSize, type: 'pen' }]);
    } else if (tool === 'line') {
      setIsDrawing(true);
      setTempLine({ startX: pos.x, startY: pos.y, endX: pos.x, endY: pos.y });
      setLineAngle(0);
      setLineLength(0);
      // Convert initial position to meters
      const canvasWidth = 800;
      const canvasHeight = 600;
      const pixelsToMetersX = canvasSize / canvasWidth;
      const pixelsToMetersY = (canvasSize * canvasHeight / canvasWidth) / canvasHeight;
      setDistanceToLeft(pos.x * pixelsToMetersX);
      setDistanceToTop(pos.y * pixelsToMetersY);
    } else if (tool === 'eraser') {
      setIsDrawing(true);
      setLines([...lines, { points: [pos.x, pos.y], brushSize, type: 'eraser' }]);
    } else if (tool === 'bucket') {
      const fillShape = floodFill(stage, pos.x, pos.y, fillColor);
      if (fillShape) {
        setLines([...lines, fillShape]);
      }
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    
    if (tool === 'pen') {
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      
      const newLines = lines.slice();
      newLines.splice(lines.length - 1, 1, lastLine);
      setLines(newLines);
    } else if (tool === 'line' && tempLine) {
      setTempLine({ ...tempLine, endX: point.x, endY: point.y });
      const angle = calculateAngle(tempLine.startX, tempLine.startY, point.x, point.y);
      setLineAngle(angle);
      
      // Calculate line length in pixels, then convert to meters
      const canvasWidth = 800; // Canvas width in pixels
      const canvasHeight = 600; // Canvas height in pixels
      const pixelsToMetersX = canvasSize / canvasWidth; // meters per pixel (width)
      const pixelsToMetersY = (canvasSize * canvasHeight / canvasWidth) / canvasHeight; // meters per pixel (height)
      
      const dx = point.x - tempLine.startX;
      const dy = point.y - tempLine.startY;
      const lengthPixels = Math.sqrt(dx * dx + dy * dy);
      // Convert to meters using average scale (or use X scale for simplicity)
      const lengthMeters = lengthPixels * pixelsToMetersX;
      setLineLength(lengthMeters);
      
      // Distance to left (x coordinate) and top (y coordinate) in meters
      setDistanceToLeft(point.x * pixelsToMetersX);
      setDistanceToTop(point.y * pixelsToMetersY);
    } else if (tool === 'eraser') {
      const lastLine = lines[lines.length - 1];
      lastLine.points = lastLine.points.concat([point.x, point.y]);
      
      const newLines = lines.slice();
      newLines.splice(lines.length - 1, 1, lastLine);
      setLines(newLines);
    }
  };

  const handleMouseUp = () => {
    if (tool === 'line' && tempLine) {
      // Finalize the line
      setLines([
        ...lines,
        {
          points: [tempLine.startX, tempLine.startY, tempLine.endX, tempLine.endY],
          brushSize,
          type: 'line',
        },
      ]);
      setTempLine(null);
      setLineAngle(null);
      setLineLength(null);
      setDistanceToLeft(null);
      setDistanceToTop(null);
    }
    setIsDrawing(false);
  };

  if (!isClient || !KonvaComponents) {
    return (
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white w-[800px] h-[600px] flex items-center justify-center">
        <p className="text-gray-500">Loading canvas...</p>
      </div>
    );
  }

  const { Stage, Layer, Line, Rect, Text, Image } = KonvaComponents;

  return (
    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white relative">
      <Stage
        ref={stageRef}
        width={800}
        height={600}
        onMouseDown={handleMouseDown}
        onMousemove={(e: any) => {
          handleMouseMove(e);
          // Also track mouse position when not drawing (for line/pen tools)
          if ((tool === 'line' || tool === 'pen') && !isDrawing) {
            const stage = e.target.getStage();
            const point = stage.getPointerPosition();
            if (point) {
              setMousePosition(point);
              // Calculate distance in meters
              const canvasWidth = 800;
              const canvasHeight = 600;
              const pixelsToMetersX = canvasSize / canvasWidth;
              const pixelsToMetersY = (canvasSize * canvasHeight / canvasWidth) / canvasHeight;
              setDistanceToLeft(point.x * pixelsToMetersX);
              setDistanceToTop(point.y * pixelsToMetersY);
            }
          } else {
            setMousePosition(null);
          }
        }}
        onMouseup={handleMouseUp}
        onMouseLeave={(e: any) => {
          handleMouseUp();
          setMousePosition(null);
        }}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={800}
            height={600}
            fill="white"
            listening={false}
          />
          {bgImage && (
            <Image
              image={bgImage}
              x={0}
              y={0}
              width={800}
              height={600}
              listening={false}
            />
          )}
          {lines.map((line, i) => {
            if (line.type === 'fill') {
              const img = fillImages.get(i);
              if (img) {
                return (
                  <Image
                    key={i}
                    image={img}
                    x={line.x || 0}
                    y={line.y || 0}
                    width={line.width || 800}
                    height={line.height || 600}
                    globalCompositeOperation="source-over"
                  />
                );
              }
              return null;
            }
            return (
              <Line
                key={i}
                points={line.points}
                stroke={line.type === 'eraser' ? '#FFFFFF' : '#000000'}
                strokeWidth={line.brushSize}
                tension={line.type === 'line' ? 0 : 0.5}
                lineCap="round"
                lineJoin="round"
                globalCompositeOperation={line.type === 'eraser' ? 'destination-out' : 'source-over'}
              />
            );
          })}
          {tempLine && (
            <>
              <Line
                points={[tempLine.startX, tempLine.startY, tempLine.endX, tempLine.endY]}
                stroke="#000000"
                strokeWidth={brushSize}
                tension={0}
                lineCap="round"
                globalCompositeOperation="source-over"
              />
              {(lineAngle !== null || lineLength !== null) && (
                <>
                  <Text
                    x={tempLine.endX + 10}
                    y={tempLine.endY - 30}
                    text={`${Math.round(lineAngle || 0)}°`}
                    fontSize={12}
                    fill="#FF1493"
                    fontStyle="bold"
                  />
                  {lineLength !== null && (
                    <Text
                      x={tempLine.endX + 10}
                      y={tempLine.endY - 15}
                      text={`Length: ${lineLength.toFixed(3)}m`}
                      fontSize={12}
                      fill="#FF1493"
                      fontStyle="bold"
                    />
                  )}
                  {distanceToLeft !== null && distanceToTop !== null && (
                    <Text
                      x={tempLine.endX + 10}
                      y={tempLine.endY}
                      text={`Left: ${distanceToLeft.toFixed(3)}m, Top: ${distanceToTop.toFixed(3)}m`}
                      fontSize={12}
                      fill="#FF1493"
                      fontStyle="bold"
                    />
                  )}
                </>
              )}
            </>
          )}
          {/* Show mouse position info when line or pen tool is selected (before drawing) */}
          {mousePosition && (tool === 'line' || tool === 'pen') && !isDrawing && distanceToLeft !== null && distanceToTop !== null && (
            <Text
              x={mousePosition.x + 10}
              y={mousePosition.y - 10}
              text={`Left: ${distanceToLeft.toFixed(3)}m, Top: ${distanceToTop.toFixed(3)}m`}
              fontSize={12}
              fill="#FF1493"
              fontStyle="bold"
            />
          )}
        </Layer>
      </Stage>
    </div>
  );
}

