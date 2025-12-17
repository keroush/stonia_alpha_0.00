"use client";

import { useRef, useState, useEffect, Dispatch, SetStateAction } from "react";

interface StoneImage {
  id: string;
  stoneName: string;
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
  const [stoneImageElements, setStoneImageElements] = useState<
    Map<string, HTMLImageElement>
  >(new Map());
  const stoneGroupRefs = useRef<Map<string, any>>(new Map());
  const transformerRef = useRef<any>(null);
  const previousImageDataRef = useRef<Map<string, string>>(new Map());
  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isAltPressed, setIsAltPressed] = useState(false);

  useEffect(() => {
    setIsClient(true);
    // Dynamically import react-konva only on client side
    import("react-konva").then((mod) => {
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
      if (
        !stoneImageElements.has(stone.id) ||
        previousImageData !== stone.imageData
      ) {
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
    const currentIds = new Set(stoneImages.map((s) => s.id));
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
      if ((e.key === "Delete" || e.key === "Backspace") && selectedStoneId) {
        e.preventDefault();
        onDeleteStone(selectedStoneId);
        setSelectedStoneId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedStoneId, onDeleteStone, setSelectedStoneId]);

  // Track Ctrl and Alt key states for copy functionality
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) setIsCtrlPressed(true);
      if (e.altKey) setIsAltPressed(true);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!e.ctrlKey && !e.metaKey) setIsCtrlPressed(false);
      if (!e.altKey) setIsAltPressed(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Handle rotation by 90 or -90 degrees
  const handleRotate = (angle: number) => {
    if (!selectedStoneId) return;

    const stone = stoneImages.find((s) => s.id === selectedStoneId);
    if (!stone) return;

    const newRotation = (stone.rotation + angle) % 360;
    // Normalize to -180 to 180 range
    const normalizedRotation =
      newRotation > 180
        ? newRotation - 360
        : newRotation < -180
        ? newRotation + 360
        : newRotation;

    setStoneImages(
      stoneImages.map((s) =>
        s.id === selectedStoneId ? { ...s, rotation: normalizedRotation } : s
      )
    );

    // Update the node's rotation immediately
    const node = stoneGroupRefs.current.get(selectedStoneId);
    if (node) {
      node.rotation(normalizedRotation);
      node.getLayer()?.batchDraw();
    }
  };

  // Generate G-Code function
  const generateGCode = () => {
    if (stoneImages.length === 0) {
      alert("No stone images to generate G-code for.");
      return;
    }

    // Calculate pixels-to-meters conversion
    const pixelsToMetersX = canvasSizeX / canvasWidth;
    const pixelsToMetersY = canvasSizeY / canvasHeight;

    // Generate a separate G-code file for each stone image
    stoneImages.forEach((stone, index) => {
      // Convert position from pixels to meters, then to millimeters for G-code
      const xPosMeters = stone.x * pixelsToMetersX;
      const yPosMeters = stone.y * pixelsToMetersY;
      const widthMeters = stone.width * pixelsToMetersX;
      const heightMeters = stone.height * pixelsToMetersY;

      const xPosMM = xPosMeters * 1000;
      const yPosMM = yPosMeters * 1000;
      const widthMM = widthMeters * 1000;
      const heightMM = heightMeters * 1000;

      // Generate G-code for this specific stone
      let gcode = "; G-code generated for stone cutting\n";
      gcode += "; Stone " + (index + 1) + " (ID: " + stone.id + ")\n";
      gcode +=
        "; Position: X=" +
        xPosMeters.toFixed(3) +
        "m, Y=" +
        yPosMeters.toFixed(3) +
        "m\n";
      gcode +=
        "; Size: W=" +
        widthMeters.toFixed(3) +
        "m, H=" +
        heightMeters.toFixed(3) +
        "m\n";
      gcode += "; Rotation: " + Math.round(stone.rotation) + " degrees\n";
      gcode += ";\n";
      gcode += "G21 ; Set units to millimeters\n";
      gcode += "G90 ; Set to absolute positioning\n";
      gcode += "G28 ; Home all axes\n";
      gcode += ";\n";

      // Move to position
      gcode +=
        "G0 X" +
        xPosMM.toFixed(2) +
        " Y" +
        yPosMM.toFixed(2) +
        " ; Move to stone position\n";

      // Apply rotation (if supported by machine)
      if (Math.abs(stone.rotation) > 0.1) {
        gcode +=
          "G68 X" +
          xPosMM.toFixed(2) +
          " Y" +
          yPosMM.toFixed(2) +
          " R" +
          stone.rotation.toFixed(2) +
          " ; Rotate coordinate system\n";
      }

      // Cut rectangle based on stone size (starting from center, cutting outward)
      const halfWidth = widthMM / 2;
      const halfHeight = heightMM / 2;

      gcode +=
        "G0 X" +
        (xPosMM - halfWidth).toFixed(2) +
        " Y" +
        (yPosMM - halfHeight).toFixed(2) +
        " ; Move to start position (bottom-left)\n";
      gcode += "G1 Z-5 F100 ; Lower tool (adjust Z and feed rate as needed)\n";
      gcode +=
        "G1 X" +
        (xPosMM + halfWidth).toFixed(2) +
        " Y" +
        (yPosMM - halfHeight).toFixed(2) +
        " F500 ; Cut to right\n";
      gcode +=
        "G1 X" +
        (xPosMM + halfWidth).toFixed(2) +
        " Y" +
        (yPosMM + halfHeight).toFixed(2) +
        " F500 ; Cut to top\n";
      gcode +=
        "G1 X" +
        (xPosMM - halfWidth).toFixed(2) +
        " Y" +
        (yPosMM + halfHeight).toFixed(2) +
        " F500 ; Cut to left\n";
      gcode +=
        "G1 X" +
        (xPosMM - halfWidth).toFixed(2) +
        " Y" +
        (yPosMM - halfHeight).toFixed(2) +
        " F500 ; Cut to bottom (close rectangle)\n";
      gcode += "G0 Z5 ; Raise tool\n";

      // Reset rotation if applied
      if (Math.abs(stone.rotation) > 0.1) {
        gcode += "G69 ; Cancel rotation\n";
      }

      gcode += ";\n";
      gcode += "G28 ; Home all axes\n";
      gcode += "M30 ; Program end and rewind\n";

      // Create and download the file for this stone
      const blob = new Blob([gcode], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      // File name includes stone index and size in meters
      const fileName = `stone_${index + 1}_${widthMeters.toFixed(
        3
      )}m_x_${heightMeters.toFixed(3)}m_${
        new Date().toISOString().split("T")[0]
      }.gcode`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };

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

  // Calculate ruler dimensions and tick intervals
  const rulerHeight = 20;
  const rulerWidth = 20;

  if (!isClient || !KonvaComponents) {
    return (
      <div
        className="relative"
        style={{
          width: `${canvasWidth + rulerWidth}px`,
          height: `${canvasHeight + rulerHeight}px`,
        }}
      >
        <div
          className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white flex items-center justify-center"
          style={{
            position: "absolute",
            left: `${rulerWidth}px`,
            top: `${rulerHeight}px`,
            width: `${canvasWidth}px`,
            height: `${canvasHeight}px`,
          }}
        >
          <p className="text-gray-500">Loading canvas...</p>
        </div>
      </div>
    );
  }

  const { Stage, Layer, Rect, Text, Image, Group, Transformer } =
    KonvaComponents;
  const maxDimension = Math.max(canvasSizeX, canvasSizeY);
  let tickInterval = 0.1;
  if (maxDimension > 5) tickInterval = 0.5;
  if (maxDimension > 10) tickInterval = 1.0;
  if (maxDimension > 20) tickInterval = 2.0;

  // Generate tick marks for horizontal ruler (top)
  const horizontalTicks: JSX.Element[] = [];
  const horizontalLabels: JSX.Element[] = [];
  for (let meters = 0; meters <= canvasSizeX; meters += tickInterval) {
    const x = (meters / canvasSizeX) * canvasWidth;
    const tickHeight = meters % (tickInterval * 5) === 0 ? 12 : 6;
    horizontalTicks.push(
      <div
        key={`h-tick-${meters}`}
        style={{
          position: "absolute",
          left: `${x}px`,
          top: "0",
          width: "1px",
          height: `${tickHeight}px`,
          backgroundColor: "#666",
        }}
      />
    );
    if (meters % (tickInterval * 5) === 0 && meters > 0) {
      horizontalLabels.push(
        <div
          key={`h-label-${meters}`}
          style={{
            position: "absolute",
            left: `${x}px`,
            top: `${tickHeight + 2}px`,
            fontSize: "10px",
            color: "#333",
            transform: "translateX(-50%)",
            whiteSpace: "nowrap",
            zIndex: 10,
          }}
        >
          {meters.toFixed(1)}m
        </div>
      );
    }
  }

  // Generate tick marks for vertical ruler (left)
  const verticalTicks: JSX.Element[] = [];
  const verticalLabels: JSX.Element[] = [];
  for (let meters = 0; meters <= canvasSizeY; meters += tickInterval) {
    const y = (meters / canvasSizeY) * canvasHeight;
    const tickWidth = meters % (tickInterval * 5) === 0 ? 12 : 6;
    verticalTicks.push(
      <div
        key={`v-tick-${meters}`}
        style={{
          position: "absolute",
          left: "0",
          top: `${y}px`,
          width: `${tickWidth}px`,
          height: "1px",
          backgroundColor: "#666",
        }}
      />
    );
    if (meters % (tickInterval * 5) === 0 && meters > 0) {
      verticalLabels.push(
        <div
          key={`v-label-${meters}`}
          style={{
            position: "absolute",
            left: `${tickWidth + 2}px`,
            top: `${y}px`,
            fontSize: "10px",
            color: "#333",
            transform: "translateY(-50%)",
            whiteSpace: "nowrap",
          }}
        >
          {meters.toFixed(1)}m
        </div>
      );
    }
  }

  return (
    <div
      className="relative mt-16"
      style={{
        width: `${canvasWidth + rulerWidth}px`,
        height: `${canvasHeight + rulerHeight}px`,
      }}
    >
      {/* Generate G-Code Button */}
      <div className="absolute left-0 -top-16 grid grid-cols-3 gap-4">
        <button
          onClick={() => {
            // Store stone images data in localStorage
            const stoneData = {
              stoneImages: stoneImages,
              canvasSizeX: canvasSizeX,
              canvasSizeY: canvasSizeY,
              canvasWidth: canvasWidth,
              canvasHeight: canvasHeight,
            };
            localStorage.setItem("stonia3DData", JSON.stringify(stoneData));
            const url = `/canvas3DPre?width=${canvasSizeX}&height=${canvasSizeY}`;
            window.open(url, "_blank");
          }}
          className="px-6 py-2 bg-blue-400 text-white rounded-lg hover:bg-blue-500 transition-colors justify-center font-medium flex items-center gap-2 h-12 cursor-pointer"
        >
          stonia
        </button>
        <button
          onClick={generateGCode}
          disabled={stoneImages.length === 0}
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2 shadow-lg h-12"
          title={
            stoneImages.length === 0
              ? "Add stone images to generate G-code"
              : "Generate and download G-code for all stone images"
          }
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Generate G-Code
        </button>
        {/* Rotation Control Panel - appears when stone is selected */}
        {selectedStoneId && (
          <div className="bg-white border-2 border-blue-500 rounded-lg shadow-lg p-2">
            <div className="flex gap-2">
              <button
                onClick={() => handleRotate(-90)}
                className="w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                title="Rotate -90°"
              >
                ↺ -90°
              </button>
              <button
                onClick={() => handleRotate(90)}
                className="w-full px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm font-medium"
                title="Rotate +90°"
              >
                ↻ +90°
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Horizontal ruler (top) */}
      <div
        className="absolute bg-gray-100 border-b border-gray-400"
        style={{
          left: `${rulerWidth}px`,
          top: "0",
          width: `${canvasWidth}px`,
          height: `${rulerHeight}px`,
        }}
      >
        {horizontalTicks}
        {horizontalLabels}
      </div>

      {/* Vertical ruler (left) */}
      <div
        className="absolute bg-gray-100 border-r border-gray-400"
        style={{
          left: "0",
          top: `${rulerHeight}px`,
          width: `${rulerWidth}px`,
          height: `${canvasHeight}px`,
        }}
      >
        {verticalTicks}
        {verticalLabels}
      </div>

      {/* Corner (top-left) */}
      <div
        className="absolute bg-gray-100 border-b border-r border-gray-400"
        style={{
          left: "0",
          top: "0",
          width: `${rulerWidth}px`,
          height: `${rulerHeight}px`,
        }}
      />

      {/* Canvas */}
      <div
        className="border-2 border-gray-300 overflow-hidden bg-white"
        style={{
          position: "absolute",
          left: `${rulerWidth}px`,
          top: `${rulerHeight}px`,
          width: `${canvasWidth}px`,
          height: `${canvasHeight}px`,
        }}
      >
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

              // Use stored position (Konva handles live position internally during drag)
              const currentX = stone.x;
              const currentY = stone.y;
              const currentRotation = stone.rotation;

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
              ].map((corner) => ({
                x: currentX + corner.x * cos - corner.y * sin,
                y: currentY + corner.x * sin + corner.y * cos,
              }));

              // Find min/max bounds
              const minX = Math.min(...corners.map((c) => c.x));
              const maxX = Math.max(...corners.map((c) => c.x));
              const minY = Math.min(...corners.map((c) => c.y));
              const maxY = Math.max(...corners.map((c) => c.y));

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
                    ].map((corner) => ({
                      x: pos.x + corner.x * cos - corner.y * sin,
                      y: pos.y + corner.x * sin + corner.y * cos,
                    }));

                    const newMinX = Math.min(...newCorners.map((c) => c.x));
                    const newMaxX = Math.max(...newCorners.map((c) => c.x));
                    const newMinY = Math.min(...newCorners.map((c) => c.y));
                    const newMaxY = Math.max(...newCorners.map((c) => c.y));

                    let constrainedX = pos.x;
                    let constrainedY = pos.y;

                    if (newMinX < 0) constrainedX = pos.x - newMinX;
                    if (newMaxX > canvasWidth)
                      constrainedX = pos.x - (newMaxX - canvasWidth);
                    if (newMinY < 0) constrainedY = pos.y - newMinY;
                    if (newMaxY > canvasHeight)
                      constrainedY = pos.y - (newMaxY - canvasHeight);

                    return { x: constrainedX, y: constrainedY };
                  }}
                  onClick={(e: any) => {
                    e.cancelBubble = true;
                    setSelectedStoneId(stone.id);
                  }}
                  onDragEnd={(e: { target: any }) => {
                    const node = e.target;
                    if (!node) return;

                    const newX = node.x();
                    const newY = node.y();

                    // Check if Ctrl+Alt is pressed to copy instead of move
                    if (isCtrlPressed && isAltPressed) {
                      // Create a copy of the stone image at the new position
                      const newStoneImage: StoneImage = {
                        id: `stone-${Date.now()}-${Math.random()
                          .toString(36)
                          .substr(2, 9)}`,
                        stoneName: stone.stoneName,
                        imageData: stone.imageData,
                        x: newX,
                        y: newY,
                        width: stone.width,
                        height: stone.height,
                        rotation: stone.rotation,
                        originalImageUrl: stone.originalImageUrl,
                        cropSelection: stone.cropSelection,
                      };

                      // Reset the original node to its starting position
                      node.x(stone.x);
                      node.y(stone.y);

                      // Add the copy and keep the original at its starting position
                      setStoneImages([
                        ...stoneImages.map((s) =>
                          s.id === stone.id
                            ? { ...s, x: stone.x, y: stone.y } // Keep original at starting position
                            : s
                        ),
                        newStoneImage,
                      ]);

                      // Select the new copy
                      setSelectedStoneId(newStoneImage.id);
                    } else {
                      // Normal move - update stored position
                      setStoneImages(
                        stoneImages.map((s) =>
                          s.id === stone.id ? { ...s, x: newX, y: newY } : s
                        )
                      );
                    }
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
                    ].map((corner) => ({
                      x: newX + corner.x * cos - corner.y * sin,
                      y: newY + corner.x * sin + corner.y * cos,
                    }));

                    const transformMinX = Math.min(...corners.map((c) => c.x));
                    const transformMaxX = Math.max(...corners.map((c) => c.x));
                    const transformMinY = Math.min(...corners.map((c) => c.y));
                    const transformMaxY = Math.max(...corners.map((c) => c.y));

                    let constrainedX = newX;
                    let constrainedY = newY;

                    if (transformMinX < 0) constrainedX = newX - transformMinX;
                    if (transformMaxX > canvasWidth)
                      constrainedX = newX - (transformMaxX - canvasWidth);
                    if (transformMinY < 0) constrainedY = newY - transformMinY;
                    if (transformMaxY > canvasHeight)
                      constrainedY = newY - (transformMaxY - canvasHeight);

                    node.x(constrainedX);
                    node.y(constrainedY);
                  }}
                  onTransformEnd={(e: { target: any }) => {
                    const node = e.target;
                    if (!node) return;

                    const newX = node.x();
                    const newY = node.y();
                    const newRotation = node.rotation();

                    setStoneImages(
                      stoneImages.map((s) =>
                        s.id === stone.id
                          ? { ...s, x: newX, y: newY, rotation: newRotation }
                          : s
                      )
                    );
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
                  {/* Blue border when selected */}
                  {isSelected && (
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
                  {/* Show position and rotation info when selected */}
                  {isSelected && (
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
                  {/* Width and height labels on top and right edges (inside) */}
                  {isSelected && (
                    <>
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
                    </>
                  )}
                </Group>
              );
            })}

            {/* Transformer for rotation handle - only show when selected */}
            {selectedStoneId &&
              stoneGroupRefs.current.has(selectedStoneId) &&
              KonvaComponents &&
              (() => {
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

      {/* Top Control Bar - Rotation controls and Generate G-Code button */}
      <div
        className="absolute flex items-center gap-3 z-20"
        style={{
          top: "10px",
          right: "10px",
        }}
      ></div>
    </div>
  );
}
