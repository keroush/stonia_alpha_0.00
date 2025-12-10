'use client';

import { useRef, useState, useEffect, Dispatch, SetStateAction } from 'react';

interface StoneImage {
  id: string;
  imageData: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  originalImageUrl: string;
  cropSelection: { startX: number; startY: number; endX: number; endY: number };
}

interface DrawingCanvasProps {
  backgroundImage: string | null;
  stageRef: React.RefObject<any>;
  canvasSizeX: number; // Canvas width in meters
  canvasSizeY: number; // Canvas height in meters
  stoneImages: StoneImage[];
  setStoneImages: Dispatch<SetStateAction<StoneImage[]>>;
  selectedStoneId: string | null;
  setSelectedStoneId: (id: string | null) => void;
  onDeleteStone: (id: string) => void;
}

export default function DrawingCanvas({
  backgroundImage,
  stageRef,
  canvasSizeX,
  canvasSizeY,
  stoneImages,
  setStoneImages,
  selectedStoneId,
  setSelectedStoneId,
  onDeleteStone,
}: DrawingCanvasProps) {
  const [isClient, setIsClient] = useState(false);
  const [KonvaComponents, setKonvaComponents] = useState<any>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [stoneImageElements, setStoneImageElements] = useState<Map<string, HTMLImageElement>>(new Map());
  const stoneGroupRefs = useRef<Map<string, any>>(new Map());
  const transformerRef = useRef<any>(null);
  const previousImageDataRef = useRef<Map<string, string>>(new Map());
  const [liveStonePositions, setLiveStonePositions] = useState<Map<string, { x: number; y: number; rotation: number }>>(new Map());

  useEffect(() => {
    setIsClient(true);
    // Dynamically import react-konva only on client side
    import('react-konva').then((mod) => {
      setKonvaComponents(mod);
    });
  }, []);


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

  // Load stone images
  useEffect(() => {
    stoneImages.forEach((stone) => {
      const previousImageData = previousImageDataRef.current.get(stone.id);
      // Load new image if it doesn't exist or if imageData has changed
      if (!stoneImageElements.has(stone.id) || previousImageData !== stone.imageData) {
        const img = new window.Image();
        img.onload = () => {
          setStoneImageElements((prev) => {
            const updated = new Map(prev);
            updated.set(stone.id, img);
            return updated;
          });
        };
        img.src = stone.imageData;
        // Update the ref to track this imageData
        previousImageDataRef.current.set(stone.id, stone.imageData);
      }
    });
    
    // Remove images that are no longer in stoneImages
    const currentIds = new Set(stoneImages.map(s => s.id));
    stoneImageElements.forEach((_, id) => {
      if (!currentIds.has(id)) {
        setStoneImageElements((prev) => {
          const updated = new Map(prev);
          updated.delete(id);
          return updated;
        });
        previousImageDataRef.current.delete(id);
      }
    });
  }, [stoneImages]);

  // Handle keyboard delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedStoneId) {
        e.preventDefault();
        onDeleteStone(selectedStoneId);
        setSelectedStoneId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedStoneId, onDeleteStone, setSelectedStoneId]);

  // Update transformer when selection changes
  useEffect(() => {
    if (transformerRef.current && selectedStoneId) {
      const node = stoneGroupRefs.current.get(selectedStoneId);
      if (node) {
        // Force update the transformer
        transformerRef.current.nodes([node]);
        transformerRef.current.getLayer()?.batchDraw();
      }
    } else if (transformerRef.current && !selectedStoneId) {
      // Clear transformer when nothing is selected
      transformerRef.current.nodes([]);
    }
  }, [selectedStoneId, stoneImages]);


  // Calculate canvas dimensions based on size in meters, maintaining aspect ratio
  // Max display size: 1200px for width or height
  const maxDisplaySize = 1200;
  const aspectRatio = canvasSizeX / canvasSizeY;
  let canvasWidth = 800;
  let canvasHeight = 600;
  
  if (aspectRatio >= 1) {
    // Width is larger or equal
    canvasWidth = Math.min(maxDisplaySize, 800);
    canvasHeight = canvasWidth / aspectRatio;
  } else {
    // Height is larger
    canvasHeight = Math.min(maxDisplaySize, 600);
    canvasWidth = canvasHeight * aspectRatio;
  }
  
  // Ensure minimum size
  if (canvasWidth < 400) {
    canvasWidth = 400;
    canvasHeight = canvasWidth / aspectRatio;
  }
  if (canvasHeight < 300) {
    canvasHeight = 300;
    canvasWidth = canvasHeight * aspectRatio;
  }


  if (!isClient || !KonvaComponents) {
    return (
      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
        <p className="text-gray-500">Loading canvas...</p>
      </div>
    );
  }

  const { Stage, Layer, Rect, Text, Image, Group, Transformer } = KonvaComponents;

  return (
    <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white relative" style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}>
      <Stage
        ref={stageRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={(e: any) => {
          // Deselect stone if clicking on empty space
          const clickedOnEmpty = e.target === e.target.getStage();
          if (clickedOnEmpty) {
            setSelectedStoneId(null);
          }
        }}
      >
        <Layer>
          <Rect
            x={0}
            y={0}
            width={canvasWidth}
            height={canvasHeight}
            fill="white"
            listening={false}
          />
          {bgImage && (
            <Image
              image={bgImage}
              x={0}
              y={0}
              width={canvasWidth}
              height={canvasHeight}
              listening={false}
            />
          )}
          {/* Render draggable and rotatable stone images */}
          {stoneImages.map((stone) => {
            const img = stoneImageElements.get(stone.id);
            if (!img) return null;
            const isSelected = selectedStoneId === stone.id;
            
            // Use live position if available (during drag/transform), otherwise use stored position
            const livePos = liveStonePositions.get(stone.id);
            const currentX = livePos?.x ?? stone.x;
            const currentY = livePos?.y ?? stone.y;
            const currentRotation = livePos?.rotation ?? stone.rotation;
            
            // Calculate position for display
            const pixelsToMetersX = canvasSizeX / canvasWidth;
            const pixelsToMetersY = canvasSizeY / canvasHeight;
            const distanceLeft = currentX * pixelsToMetersX;
            const distanceTop = currentY * pixelsToMetersY;
            
            // Calculate size in meters
            const widthInMeters = stone.width * pixelsToMetersX;
            const heightInMeters = stone.height * pixelsToMetersY;
            
            // Calculate bounding box for constraint checking (with rotation)
            const halfWidth = stone.width / 2;
            const halfHeight = stone.height / 2;
            const cos = Math.cos((currentRotation * Math.PI) / 180);
            const sin = Math.sin((currentRotation * Math.PI) / 180);
            
            // Calculate rotated corners
            const corners = [
              { x: -halfWidth, y: -halfHeight },
              { x: halfWidth, y: -halfHeight },
              { x: halfWidth, y: halfHeight },
              { x: -halfWidth, y: halfHeight },
            ].map(corner => ({
              x: currentX + corner.x * cos - corner.y * sin,
              y: currentY + corner.x * sin + corner.y * cos,
            }));
            
            // Find min/max bounds
            const minX = Math.min(...corners.map(c => c.x));
            const maxX = Math.max(...corners.map(c => c.x));
            const minY = Math.min(...corners.map(c => c.y));
            const maxY = Math.max(...corners.map(c => c.y));
            
            return (
              <Group
                key={stone.id}
                ref={(node: any) => {
                  if (node) {
                    stoneGroupRefs.current.set(stone.id, node);
                  } else {
                    stoneGroupRefs.current.delete(stone.id);
                  }
                }}
                x={currentX}
                y={currentY}
                rotation={currentRotation}
                draggable
                dragBoundFunc={(pos: { x: number; y: number }) => {
                  // Constrain dragging to keep image within canvas (with rotation)
                  const cos = Math.cos((currentRotation * Math.PI) / 180);
                  const sin = Math.sin((currentRotation * Math.PI) / 180);
                  const newCorners = [
                    { x: -halfWidth, y: -halfHeight },
                    { x: halfWidth, y: -halfHeight },
                    { x: halfWidth, y: halfHeight },
                    { x: -halfWidth, y: halfHeight },
                  ].map(corner => ({
                    x: pos.x + corner.x * cos - corner.y * sin,
                    y: pos.y + corner.x * sin + corner.y * cos,
                  }));
                  
                  const newMinX = Math.min(...newCorners.map(c => c.x));
                  const newMaxX = Math.max(...newCorners.map(c => c.x));
                  const newMinY = Math.min(...newCorners.map(c => c.y));
                  const newMaxY = Math.max(...newCorners.map(c => c.y));
                  
                  let constrainedX = pos.x;
                  let constrainedY = pos.y;
                  
                  if (newMinX < 0) constrainedX = pos.x - newMinX;
                  if (newMaxX > canvasWidth) constrainedX = pos.x - (newMaxX - canvasWidth);
                  if (newMinY < 0) constrainedY = pos.y - newMinY;
                  if (newMaxY > canvasHeight) constrainedY = pos.y - (newMaxY - canvasHeight);
                  
                  return { x: constrainedX, y: constrainedY };
                }}
                onClick={(e: any) => {
                  e.cancelBubble = true;
                  setSelectedStoneId(stone.id);
                }}
                onDragMove={(e: { target: any }) => {
                  const node = e.target;
                  if (!node) return;
                  
                  const newX = node.x();
                  const newY = node.y();
                  
                  // Update live position for real-time tracking
                  setLiveStonePositions(prev => {
                    const updated = new Map(prev);
                    updated.set(stone.id, { x: newX, y: newY, rotation: currentRotation });
                    return updated;
                  });
                }}
                onDragEnd={(e: { target: any }) => {
                  const node = e.target;
                  if (!node) return;
                  
                  const newX = node.x();
                  const newY = node.y();
                  
                  // Clear live position and update stored position
                  setLiveStonePositions(prev => {
                    const updated = new Map(prev);
                    updated.delete(stone.id);
                    return updated;
                  });
                  
                  setStoneImages(stoneImages.map(s => 
                    s.id === stone.id 
                      ? { ...s, x: newX, y: newY }
                      : s
                  ));
                }}
                onTransform={(e: { target: any }) => {
                  const node = e.target;
                  if (!node) return;
                  
                  const newX = node.x();
                  const newY = node.y();
                  const newRotation = node.rotation();
                  
                  // Constrain transform to keep image within canvas
                  const cos = Math.cos((newRotation * Math.PI) / 180);
                  const sin = Math.sin((newRotation * Math.PI) / 180);
                  const corners = [
                    { x: -halfWidth, y: -halfHeight },
                    { x: halfWidth, y: -halfHeight },
                    { x: halfWidth, y: halfHeight },
                    { x: -halfWidth, y: halfHeight },
                  ].map(corner => ({
                    x: newX + corner.x * cos - corner.y * sin,
                    y: newY + corner.x * sin + corner.y * cos,
                  }));
                  
                  const transformMinX = Math.min(...corners.map(c => c.x));
                  const transformMaxX = Math.max(...corners.map(c => c.x));
                  const transformMinY = Math.min(...corners.map(c => c.y));
                  const transformMaxY = Math.max(...corners.map(c => c.y));
                  
                  let constrainedX = newX;
                  let constrainedY = newY;
                  
                  if (transformMinX < 0) constrainedX = newX - transformMinX;
                  if (transformMaxX > canvasWidth) constrainedX = newX - (transformMaxX - canvasWidth);
                  if (transformMinY < 0) constrainedY = newY - transformMinY;
                  if (transformMaxY > canvasHeight) constrainedY = newY - (transformMaxY - canvasHeight);
                  
                  node.x(constrainedX);
                  node.y(constrainedY);
                  
                  // Update live position for real-time tracking
                  setLiveStonePositions(prev => {
                    const updated = new Map(prev);
                    updated.set(stone.id, { x: constrainedX, y: constrainedY, rotation: newRotation });
                    return updated;
                  });
                }}
                onTransformEnd={(e: { target: any }) => {
                  const node = e.target;
                  if (!node) return;
                  
                  const newX = node.x();
                  const newY = node.y();
                  const newRotation = node.rotation();
                  
                  // Clear live position and update stored position
                  setLiveStonePositions(prev => {
                    const updated = new Map(prev);
                    updated.delete(stone.id);
                    return updated;
                  });
                  
                  setStoneImages(stoneImages.map(s => 
                    s.id === stone.id 
                      ? { ...s, x: newX, y: newY, rotation: newRotation }
                      : s
                  ));
                }}
              >
              <Image
                image={img}
                x={-stone.width / 2}
                y={-stone.height / 2}
                width={stone.width}
                height={stone.height}
                listening={true}
              />
              {/* Blue border when selected or moving */}
              {(isSelected || livePos) && (
                <Rect
                  x={-stone.width / 2 - 2}
                  y={-stone.height / 2 - 2}
                  width={stone.width + 4}
                  height={stone.height + 4}
                  stroke="#3B82F6"
                  strokeWidth={3}
                  listening={false}
                />
              )}
              {/* Show position and rotation info when selected or moving */}
              {(isSelected || livePos) && (
                <>
                  <Text
                      x={stone.width / 2 + 10}
                      y={-stone.height / 2 - 50}
                      text={`Left: ${distanceLeft.toFixed(3)}m`}
                      fontSize={11}
                    fill="#FF1493"
                    fontStyle="bold"
                      listening={false}
                      shadowColor="white"
                      shadowBlur={3}
                  />
                    <Text
                      x={stone.width / 2 + 10}
                      y={-stone.height / 2 - 35}
                      text={`Top: ${distanceTop.toFixed(3)}m`}
                      fontSize={11}
                      fill="#FF1493"
                      fontStyle="bold"
                      listening={false}
                      shadowColor="white"
                      shadowBlur={3}
                    />
                    <Text
                      x={stone.width / 2 + 10}
                      y={-stone.height / 2 - 20}
                      text={`Rotation: ${Math.round(currentRotation)}°`}
                      fontSize={11}
                      fill="#FF1493"
                      fontStyle="bold"
                      listening={false}
                      shadowColor="white"
                      shadowBlur={3}
                    />
                </>
              )}
                {/* Show size labels inside image near edges - width on top, height on right */}
                {/* Width label on top edge (inside) */}
                <Text
                  x={0}
                  y={-stone.height / 2 + 12}
                  text={`${widthInMeters.toFixed(3)} m`}
                  fontSize={11}
                  fill="#3B82F6"
                  fontStyle="bold"
                  listening={false}
                  shadowColor="white"
                  shadowBlur={3}
                  align="center"
                />
                {/* Height label on right edge (inside) */}
            <Text
                  x={stone.width / 2 - 12}
                  y={0}
                  text={`${heightInMeters.toFixed(3)} m`}
                  fontSize={11}
                  fill="#3B82F6"
              fontStyle="bold"
                  listening={false}
                  shadowColor="white"
                  shadowBlur={3}
                  align="center"
                  rotation={90}
                />
                
              </Group>
            );
          })}
          
          {/* Transformer for rotation handle - only show when selected */}
          {selectedStoneId && stoneGroupRefs.current.has(selectedStoneId) && KonvaComponents && (() => {
            const node = stoneGroupRefs.current.get(selectedStoneId);
            if (!node) return null;
            
            return (
              <Transformer
                ref={transformerRef}
                nodes={[node]}
                rotateEnabled={true}
                resizeEnabled={false}
                enabledAnchors={[]}
                borderEnabled={false}
                ignoreStroke={true}
                rotateAnchorOffset={30}
                rotateAnchorFill="#3B82F6"
                rotateAnchorStroke="#1E40AF"
                rotateAnchorStrokeWidth={2}
                rotateAnchorSize={10}
              />
            );
          })()}
          
        </Layer>
      </Stage>
    </div>
  );
}

