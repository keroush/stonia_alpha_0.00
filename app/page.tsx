"use client";

import { useRef, useState, useEffect } from "react";
import DrawingCanvas from "@/components/DrawingCanvas";

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

interface IgnoreArea {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStoneImage, setSelectedStoneImage] = useState<string | null>(
    null
  );
  const [showSlabDialog, setShowSlabDialog] = useState(false);
  const [slabDialogState, setSlabDialogState] = useState<"select" | "crop">(
    "select"
  );
  const [slabDialogTab, setSlabDialogTab] = useState<"new" | "used">("new");
  const [selectedSlabImage, setSelectedSlabImage] = useState<string | null>(
    null
  );
  const [cropSelection, setCropSelection] = useState<{
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [isResizingSelection, setIsResizingSelection] = useState(false);
  const justFinishedDraggingRef = useRef(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(
    null
  );
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } | null>(null);
  const slabImageRef = useRef<HTMLImageElement | null>(null);
  const slabContainerRef = useRef<HTMLDivElement | null>(null);
  const selectionOverlayRef = useRef<HTMLElement | SVGSVGElement | null>(null);

  // Shape selection state
  const [selectedShape, setSelectedShape] = useState<
    "rectangle" | "circle" | "triangle" | "cube"
  >("rectangle");
  const [shapeWidth, setShapeWidth] = useState<number>(1.0); // in meters
  const [shapeHeight, setShapeHeight] = useState<number>(1.0); // in meters
  const [shapePosition, setShapePosition] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Canvas size state (in meters)
  const [canvasSizeX, setCanvasSizeX] = useState<number>(2);
  const [canvasSizeY, setCanvasSizeY] = useState<number>(2);

  // Stone images on canvas
  const [stoneImages, setStoneImages] = useState<StoneImage[]>([]);
  const [selectedStoneId, setSelectedStoneId] = useState<string | null>(null);
  const [showStoneViewDialog, setShowStoneViewDialog] = useState(false);
  const [viewingStone, setViewingStone] = useState<StoneImage | null>(null);
  const viewStoneImageRef = useRef<HTMLImageElement | null>(null);
  const viewStoneContainerRef = useRef<HTMLDivElement | null>(null);
  const viewOverlayRef = useRef<HTMLDivElement | null>(null);
  const [cropOverlayStyle, setCropOverlayStyle] = useState<{
    left: string;
    top: string;
    width: string;
    height: string;
  } | null>(null);
  const [isDraggingViewOverlay, setIsDraggingViewOverlay] = useState(false);
  const [viewDragOffset, setViewDragOffset] = useState<{
    x: number;
    y: number;
  } | null>(null);

  // Ignore areas state
  const [ignoreAreas, setIgnoreAreas] = useState<IgnoreArea[]>([]);
  const [selectedIgnoreAreaId, setSelectedIgnoreAreaId] = useState<
    string | null
  >(null);
  const [showIgnoreAreaDialog, setShowIgnoreAreaDialog] = useState(false);
  const [ignoreAreaWidth, setIgnoreAreaWidth] = useState<number>(0.5);
  const [ignoreAreaHeight, setIgnoreAreaHeight] = useState<number>(0.5);

  // Canvas state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const stageRef = useRef<any>(null);

  const handleDeleteStone = (id: string) => {
    setStoneImages(stoneImages.filter((stone) => stone.id !== id));
    if (selectedStoneId === id) {
      setSelectedStoneId(null);
    }
  };

  const handleDeleteIgnoreArea = (id: string) => {
    setIgnoreAreas(ignoreAreas.filter((area) => area.id !== id));
    if (selectedIgnoreAreaId === id) {
      setSelectedIgnoreAreaId(null);
    }
  };

  const handleAddIgnoreArea = () => {
    // Calculate canvas dimensions (same logic as elsewhere)
    const aspectRatio = canvasSizeX / canvasSizeY;
    const maxCanvasSize = 1200;
    let canvasWidth = 800;
    let canvasHeight = 600;

    if (aspectRatio >= 1) {
      canvasWidth = Math.min(maxCanvasSize, 800);
      canvasHeight = canvasWidth / aspectRatio;
    } else {
      canvasHeight = Math.min(maxCanvasSize, 600);
      canvasWidth = canvasHeight * aspectRatio;
    }

    if (canvasWidth < 400) {
      canvasWidth = 400;
      canvasHeight = canvasWidth / aspectRatio;
    }
    if (canvasHeight < 300) {
      canvasHeight = 300;
      canvasWidth = canvasHeight * aspectRatio;
    }

    // Calculate pixels-to-meters conversion
    const pixelsToMetersX = canvasSizeX / canvasWidth;
    const pixelsToMetersY = canvasSizeY / canvasHeight;

    // Convert meters to pixels
    const widthInPixels = ignoreAreaWidth / pixelsToMetersX;
    const heightInPixels = ignoreAreaHeight / pixelsToMetersY;

    // Create new ignore area at center of canvas
    const newIgnoreArea: IgnoreArea = {
      id: `ignore-${Date.now()}`,
      x: canvasWidth / 2 - widthInPixels / 2,
      y: canvasHeight / 2 - heightInPixels / 2,
      width: widthInPixels,
      height: heightInPixels,
    };

    setIgnoreAreas([...ignoreAreas, newIgnoreArea]);
    setShowIgnoreAreaDialog(false);
  };

  // Stone slab images with example size properties (in meters)
  const slabImages = [
    {
      id: "stone1",
      name: "Stone 1",
      url: "/images/stone.1.png",
      exampleWidthMeters: 3.0,
      exampleHeightMeters: 3.0,
    },
    {
      id: "stone2",
      name: "Stone 2",
      url: "/images/stone.2.png",
      exampleWidthMeters: 3.0,
      exampleHeightMeters: 3.0,
    },
    {
      id: "stone3",
      name: "Stone 3",
      url: "/images/stone.3.png",
      exampleWidthMeters: 3.0,
      exampleHeightMeters: 3.0,
    },
  ];

  const handleSlabImageClick = (url: string) => {
    setSelectedSlabImage(url);
    setSlabDialogState("crop");
    setCropSelection(null);
    setShapePosition(null);
  };

  // Simple function to update crop selection directly from position (used during drag)
  const updateCropSelectionDirectly = (centerX: number, centerY: number) => {
    if (
      !slabImageRef.current ||
      !slabContainerRef.current ||
      !selectedSlabImage
    )
      return;

    const imgRect = slabImageRef.current.getBoundingClientRect();
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;

    // Find the selected slab image to get its size properties
    const selectedSlab = slabImages.find(
      (slab) => slab.url === selectedSlabImage
    );
    if (!selectedSlab) return;

    // Use the slab image's example size to calculate pixels-to-meters conversion
    const pixelsToMetersX = selectedSlab.exampleWidthMeters / imgDisplayWidth;
    const pixelsToMetersY = selectedSlab.exampleHeightMeters / imgDisplayHeight;

    // Convert meters to pixels (in image display space)
    const widthInPixels = shapeWidth / pixelsToMetersX;
    const heightInPixels = shapeHeight / pixelsToMetersY;

    // Calculate selection bounds based on shape - use exact center without recalculation
    let startX: number, startY: number, endX: number, endY: number;

    if (selectedShape === "circle") {
      const radius = Math.max(widthInPixels, heightInPixels) / 2;
      startX = centerX - radius;
      startY = centerY - radius;
      endX = centerX + radius;
      endY = centerY + radius;
    } else if (selectedShape === "triangle") {
      const triangleHeight = heightInPixels;
      const triangleWidth = widthInPixels;
      startX = centerX - triangleWidth / 2;
      startY = centerY - triangleHeight / 2;
      endX = centerX + triangleWidth / 2;
      endY = centerY + triangleHeight / 2;
    } else {
      // Rectangle or cube
      startX = centerX - widthInPixels / 2;
      startY = centerY - heightInPixels / 2;
      endX = centerX + widthInPixels / 2;
      endY = centerY + heightInPixels / 2;
    }

    // Only clamp bounds to image edges, don't recalculate center
    startX = Math.max(0, Math.min(startX, imgDisplayWidth));
    startY = Math.max(0, Math.min(startY, imgDisplayHeight));
    endX = Math.max(0, Math.min(endX, imgDisplayWidth));
    endY = Math.max(0, Math.min(endY, imgDisplayHeight));

    setCropSelection({ startX, startY, endX, endY });
  };

  // Function to update crop selection based on shape and size
  const updateCropSelectionFromShape = (
    centerX: number,
    centerY: number,
    updatePosition: boolean = true
  ) => {
    if (
      !slabImageRef.current ||
      !slabContainerRef.current ||
      !selectedSlabImage
    )
      return;

    const imgRect = slabImageRef.current.getBoundingClientRect();
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;

    // Find the selected slab image to get its size properties
    const selectedSlab = slabImages.find(
      (slab) => slab.url === selectedSlabImage
    );
    if (!selectedSlab) return;

    // Use the slab image's example size to calculate pixels-to-meters conversion
    // The image display size represents the slab's example size in meters
    const pixelsToMetersX = selectedSlab.exampleWidthMeters / imgDisplayWidth;
    const pixelsToMetersY = selectedSlab.exampleHeightMeters / imgDisplayHeight;

    // Convert meters to pixels (in image display space)
    const widthInPixels = shapeWidth / pixelsToMetersX;
    const heightInPixels = shapeHeight / pixelsToMetersY;

    // Calculate selection bounds based on shape
    let startX: number, startY: number, endX: number, endY: number;
    let halfWidth: number, halfHeight: number;

    if (selectedShape === "circle") {
      // For circle, use the larger dimension
      const radius = Math.max(widthInPixels, heightInPixels) / 2;
      halfWidth = radius;
      halfHeight = radius;
      startX = centerX - radius;
      startY = centerY - radius;
      endX = centerX + radius;
      endY = centerY + radius;
    } else if (selectedShape === "triangle") {
      // For triangle, use height as the triangle height
      const triangleHeight = heightInPixels;
      const triangleWidth = widthInPixels;
      halfWidth = triangleWidth / 2;
      halfHeight = triangleHeight / 2;
      startX = centerX - halfWidth;
      startY = centerY - halfHeight;
      endX = centerX + halfWidth;
      endY = centerY + halfHeight;
    } else if (selectedShape === "cube") {
      // For cube, use width and height
      halfWidth = widthInPixels / 2;
      halfHeight = heightInPixels / 2;
      startX = centerX - halfWidth;
      startY = centerY - halfHeight;
      endX = centerX + halfWidth;
      endY = centerY + halfHeight;
    } else {
      // Rectangle (default)
      halfWidth = widthInPixels / 2;
      halfHeight = heightInPixels / 2;
      startX = centerX - halfWidth;
      startY = centerY - halfHeight;
      endX = centerX + halfWidth;
      endY = centerY + halfHeight;
    }

    // Only constrain center position if we're updating the position (not when just syncing from existing position)
    let finalCenterX = centerX;
    let finalCenterY = centerY;

    if (updatePosition) {
      // Constrain center position to keep selection within bounds
      finalCenterX = Math.max(
        halfWidth,
        Math.min(centerX, imgDisplayWidth - halfWidth)
      );
      finalCenterY = Math.max(
        halfHeight,
        Math.min(centerY, imgDisplayHeight - halfHeight)
      );

      // Update shape position if it changed
      if (finalCenterX !== centerX || finalCenterY !== centerY) {
        setShapePosition({ x: finalCenterX, y: finalCenterY });
      }
    } else {
      // When not updating position, use the exact center provided but ensure bounds are valid
      // Just clamp the bounds, don't change the center
      finalCenterX = centerX;
      finalCenterY = centerY;
    }

    // Recalculate bounds with final center
    if (selectedShape === "circle") {
      const radius = Math.max(widthInPixels, heightInPixels) / 2;
      startX = finalCenterX - radius;
      startY = finalCenterY - radius;
      endX = finalCenterX + radius;
      endY = finalCenterY + radius;
    } else if (selectedShape === "triangle") {
      const triangleHeight = heightInPixels;
      const triangleWidth = widthInPixels;
      startX = finalCenterX - triangleWidth / 2;
      startY = finalCenterY - triangleHeight / 2;
      endX = finalCenterX + triangleWidth / 2;
      endY = finalCenterY + triangleHeight / 2;
    } else {
      startX = finalCenterX - widthInPixels / 2;
      startY = finalCenterY - heightInPixels / 2;
      endX = finalCenterX + widthInPixels / 2;
      endY = finalCenterY + heightInPixels / 2;
    }

    // Final clamp to ensure bounds are within image
    startX = Math.max(0, Math.min(startX, imgDisplayWidth));
    startY = Math.max(0, Math.min(startY, imgDisplayHeight));
    endX = Math.max(0, Math.min(endX, imgDisplayWidth));
    endY = Math.max(0, Math.min(endY, imgDisplayHeight));

    setCropSelection({ startX, startY, endX, endY });
  };

  // Update selection size immediately when width/height changes
  useEffect(() => {
    if (
      shapePosition &&
      slabImageRef.current &&
      slabContainerRef.current &&
      !isDraggingSelection
    ) {
      updateCropSelectionFromShape(shapePosition.x, shapePosition.y, false);
    }
  }, [shapeWidth, shapeHeight, selectedShape]);

  const handleCropImageMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!slabImageRef.current) return;
    const containerRect = e.currentTarget.getBoundingClientRect();
    const imgRect = slabImageRef.current.getBoundingClientRect();

    // Calculate relative position within the container
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    // Check if click is within image bounds (accounting for object-contain positioning)
    const imgLeft = imgRect.left - containerRect.left;
    const imgTop = imgRect.top - containerRect.top;
    const imgRight = imgLeft + imgRect.width;
    const imgBottom = imgTop + imgRect.height;

    if (x >= imgLeft && x <= imgRight && y >= imgTop && y <= imgBottom) {
      // Convert to image-relative coordinates
      const imgX = x - imgLeft;
      const imgY = y - imgTop;
      setIsSelecting(true);
      setCropSelection({ startX: imgX, startY: imgY, endX: imgX, endY: imgY });
    }
  };

  const handleCropImageMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isSelecting || !cropSelection || !slabImageRef.current) return;
    const containerRect = e.currentTarget.getBoundingClientRect();
    const imgRect = slabImageRef.current.getBoundingClientRect();

    // Calculate relative position within the container
    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;

    // Convert to image-relative coordinates
    const imgLeft = imgRect.left - containerRect.left;
    const imgTop = imgRect.top - containerRect.top;
    const imgX = Math.max(0, Math.min(x - imgLeft, imgRect.width));
    const imgY = Math.max(0, Math.min(y - imgTop, imgRect.height));

    setCropSelection({ ...cropSelection, endX: imgX, endY: imgY });
  };

  const handleCropImageMouseUp = () => {
    setIsSelecting(false);
  };

  // Helper function to get existing crop selections for a specific slab (in display coordinates)
  const getExistingSelectionsForSlab = (slabUrl: string) => {
    return stoneImages
      .filter((stone) => stone.originalImageUrl === slabUrl)
      .map((stone) => stone.cropSelection);
  };

  // Helper function to check if new selection overlaps with existing selections
  const checkSelectionOverlap = (
    newSelection: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    },
    existingSelections: {
      startX: number;
      startY: number;
      endX: number;
      endY: number;
    }[]
  ) => {
    const newLeft = Math.min(newSelection.startX, newSelection.endX);
    const newRight = Math.max(newSelection.startX, newSelection.endX);
    const newTop = Math.min(newSelection.startY, newSelection.endY);
    const newBottom = Math.max(newSelection.startY, newSelection.endY);

    return existingSelections.some((existing) => {
      const existingLeft = Math.min(existing.startX, existing.endX);
      const existingRight = Math.max(existing.startX, existing.endX);
      const existingTop = Math.min(existing.startY, existing.endY);
      const existingBottom = Math.max(existing.startY, existing.endY);

      // Check if rectangles overlap
      return !(
        newRight <= existingLeft ||
        newLeft >= existingRight ||
        newBottom <= existingTop ||
        newTop >= existingBottom
      );
    });
  };

  const handleAddCropToCanvas = () => {
    if (!selectedSlabImage || !cropSelection || !slabImageRef.current) return;

    const img = slabImageRef.current;
    const imgRect = img.getBoundingClientRect();
    const imgNaturalWidth = img.naturalWidth;
    const imgNaturalHeight = img.naturalHeight;
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;

    // Calculate scale factors
    const scaleX = imgNaturalWidth / imgDisplayWidth;
    const scaleY = imgNaturalHeight / imgDisplayHeight;

    // Calculate crop coordinates in natural image space
    const startX = Math.min(cropSelection.startX, cropSelection.endX) * scaleX;
    const startY = Math.min(cropSelection.startY, cropSelection.endY) * scaleY;
    const endX = Math.max(cropSelection.startX, cropSelection.endX) * scaleX;
    const endY = Math.max(cropSelection.startY, cropSelection.endY) * scaleY;

    const cropWidth = endX - startX;
    const cropHeight = endY - startY;

    // Create a canvas to crop the image
    const canvas = document.createElement("canvas");
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      startX,
      startY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    );

    // Convert to data URL and add to canvas as a draggable stone image
    const croppedDataURL = canvas.toDataURL("image/png");
    setSelectedStoneImage(croppedDataURL);

    // Calculate canvas dimensions (same logic as elsewhere)
    const aspectRatio = canvasSizeX / canvasSizeY;
    const maxCanvasSize = 1200;
    let canvasWidth = 800;
    let canvasHeight = 600;

    if (aspectRatio >= 1) {
      canvasWidth = Math.min(maxCanvasSize, 800);
      canvasHeight = canvasWidth / aspectRatio;
    } else {
      canvasHeight = Math.min(maxCanvasSize, 600);
      canvasWidth = canvasHeight * aspectRatio;
    }

    if (canvasWidth < 400) {
      canvasWidth = 400;
      canvasHeight = canvasWidth / aspectRatio;
    }
    if (canvasHeight < 300) {
      canvasHeight = 300;
      canvasWidth = canvasHeight * aspectRatio;
    }

    // Calculate pixels-to-meters conversion
    const pixelsToMetersX = canvasSizeX / canvasWidth;
    const pixelsToMetersY = canvasSizeY / canvasHeight;

    // Convert the selected size in meters to pixels on the canvas
    // Use shapeWidth and shapeHeight which are the actual selected dimensions in meters
    const displayWidth = shapeWidth / pixelsToMetersX;
    const displayHeight = shapeHeight / pixelsToMetersY;

    // Store crop selection in natural image coordinates (scale-independent) for later display
    const naturalCropSelection = {
      startX: Math.min(cropSelection.startX, cropSelection.endX) * scaleX,
      startY: Math.min(cropSelection.startY, cropSelection.endY) * scaleY,
      endX: Math.max(cropSelection.startX, cropSelection.endX) * scaleX,
      endY: Math.max(cropSelection.startY, cropSelection.endY) * scaleY,
    };

    // Find the slab name for this stone
    const selectedSlab = slabImages.find(
      (slab) => slab.url === selectedSlabImage
    );
    const stoneName = selectedSlab?.name || "Stone";

    // Add to canvas stone images array (positioned at center initially)
    const newStoneImage: StoneImage = {
      id: `stone-${Date.now()}`,
      stoneName: stoneName,
      imageData: croppedDataURL,
      x: canvasWidth / 2 - displayWidth / 2, // Center position
      y: canvasHeight / 2 - displayHeight / 2, // Center position
      width: displayWidth,
      height: displayHeight,
      rotation: 0,
      originalImageUrl: selectedSlabImage,
      cropSelection: naturalCropSelection,
    };
    setStoneImages([...stoneImages, newStoneImage]);

    // Close dialog and reset state
    setShowSlabDialog(false);
    setSlabDialogState("select");
    setSelectedSlabImage(null);
    setCropSelection(null);
  };

  const handleBackToSlabSelection = () => {
    setSlabDialogState("select");
    setSelectedSlabImage(null);
    setCropSelection(null);
    setShapePosition(null);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar Toggle Button (when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-20 bg-white rounded-lg shadow-lg p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
          title="Open Background Settings"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`bg-white rounded-lg shadow-lg transition-all duration-300 flex-shrink-0 ${
          sidebarOpen ? "w-64 p-4" : "w-0 overflow-hidden p-0"
        }`}
      >
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">
                Background
              </h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
                title="Close Sidebar"
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
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {/* Canvas Size Controls */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Canvas Size (meters)
                </h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Width (X)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={canvasSizeX}
                      onChange={(e) =>
                        setCanvasSizeX(parseFloat(e.target.value) || 0.1)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">
                      Height (Y)
                    </label>
                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={canvasSizeY}
                      onChange={(e) =>
                        setCanvasSizeY(parseFloat(e.target.value) || 0.1)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => setShowSlabDialog(true)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium mb-2"
                >
                  Select Slab
                </button>
                <button
                  onClick={() => setShowIgnoreAreaDialog(true)}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
                >
                  Add Ignore Area
                </button>
              </div>

              {stoneImages.length > 0 && (
                <>
                  <div>
                    <button
                      onClick={() => {
                        setStoneImages([]);
                        setSelectedStoneImage(null);
                        setSelectedStoneId(null);
                      }}
                      className="w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                    >
                      Clear All Stones
                    </button>
                  </div>

                  {/* Preview cards for each stone image */}
                  <div className="border-t border-gray-200 pt-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">
                      Stone Images ({stoneImages.length})
                    </h3>
                    <div className="space-y-2 max-h-[400px] overflow-y-auto">
                      {stoneImages.map((stone) => {
                        // Calculate canvas dimensions (same logic as in DrawingCanvas)
                        const maxDisplaySize = 1200;
                        const aspectRatio = canvasSizeX / canvasSizeY;
                        let canvasWidth = 800;
                        let canvasHeight = 600;

                        if (aspectRatio >= 1) {
                          canvasWidth = Math.min(maxDisplaySize, 800);
                          canvasHeight = canvasWidth / aspectRatio;
                        } else {
                          canvasHeight = Math.min(maxDisplaySize, 600);
                          canvasWidth = canvasHeight * aspectRatio;
                        }

                        if (canvasWidth < 400) {
                          canvasWidth = 400;
                          canvasHeight = canvasWidth / aspectRatio;
                        }
                        if (canvasHeight < 300) {
                          canvasHeight = 300;
                          canvasWidth = canvasHeight * aspectRatio;
                        }

                        const pixelsToMetersX = canvasSizeX / canvasWidth;
                        const pixelsToMetersY = canvasSizeY / canvasHeight;
                        const distanceLeft = stone.x * pixelsToMetersX;
                        const distanceTop = stone.y * pixelsToMetersY;
                        const isSelected = selectedStoneId === stone.id;

                        return (
                          <div
                            key={stone.id}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              isSelected
                                ? "border-indigo-500 bg-indigo-50"
                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                            }`}
                            onClick={() => {
                              setSelectedStoneId(stone.id);
                              setViewingStone(stone);
                              setShowStoneViewDialog(true);
                              setCropOverlayStyle(null);
                            }}
                          >
                            <div className="flex items-start gap-2">
                              <img
                                src={stone.imageData}
                                alt="Stone preview"
                                className="w-16 h-16 object-cover rounded border border-gray-300"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-gray-700 mb-1">
                                  {stone.stoneName}
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>Left: {distanceLeft.toFixed(3)}m</div>
                                  <div>Top: {distanceTop.toFixed(3)}m</div>
                                  <div>
                                    Rotation: {Math.round(stone.rotation)}°
                                  </div>
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteStone(stone.id);
                                  }}
                                  className="mt-2 text-xs text-red-600 hover:text-red-700 hover:underline"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Ignore Areas List */}
                  {ignoreAreas.length > 0 && (
                    <div className="border-t border-gray-200 pt-4">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-sm font-semibold text-gray-700">
                          Ignore Areas ({ignoreAreas.length})
                        </h3>
                        <button
                          onClick={() => {
                            setIgnoreAreas([]);
                            setSelectedIgnoreAreaId(null);
                          }}
                          className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                        >
                          Clear All
                        </button>
                      </div>
                      <div className="space-y-2 max-h-[200px] overflow-y-auto">
                        {ignoreAreas.map((area) => {
                          // Calculate canvas dimensions (same logic as above)
                          const maxDisplaySize = 1200;
                          const aspectRatio = canvasSizeX / canvasSizeY;
                          let canvasWidth = 800;
                          let canvasHeight = 600;

                          if (aspectRatio >= 1) {
                            canvasWidth = Math.min(maxDisplaySize, 800);
                            canvasHeight = canvasWidth / aspectRatio;
                          } else {
                            canvasHeight = Math.min(maxDisplaySize, 600);
                            canvasWidth = canvasHeight * aspectRatio;
                          }

                          if (canvasWidth < 400) {
                            canvasWidth = 400;
                            canvasHeight = canvasWidth / aspectRatio;
                          }
                          if (canvasHeight < 300) {
                            canvasHeight = 300;
                            canvasWidth = canvasHeight * aspectRatio;
                          }

                          const pixelsToMetersX = canvasSizeX / canvasWidth;
                          const pixelsToMetersY = canvasSizeY / canvasHeight;
                          const distanceLeft = area.x * pixelsToMetersX;
                          const distanceTop = area.y * pixelsToMetersY;
                          const widthInMeters = area.width * pixelsToMetersX;
                          const heightInMeters = area.height * pixelsToMetersY;
                          const isSelected = selectedIgnoreAreaId === area.id;

                          return (
                            <div
                              key={area.id}
                              className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                                isSelected
                                  ? "border-orange-500 bg-orange-50"
                                  : "border-gray-200 bg-gray-50 hover:border-gray-300"
                              }`}
                              onClick={() => {
                                setSelectedIgnoreAreaId(area.id);
                              }}
                            >
                              <div className="flex items-start gap-2">
                                <div className="w-16 h-16 bg-white border-2 border-orange-400 rounded flex items-center justify-center">
                                  <span className="text-xs text-orange-600 font-medium">
                                    IGNORE
                                  </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-medium text-gray-700 mb-1">
                                    Ignore Area
                                  </div>
                                  <div className="text-xs text-gray-600 space-y-0.5">
                                    <div>Left: {distanceLeft.toFixed(3)}m</div>
                                    <div>Top: {distanceTop.toFixed(3)}m</div>
                                    <div>
                                      Size: {widthInMeters.toFixed(3)}m ×{" "}
                                      {heightInMeters.toFixed(3)}m
                                    </div>
                                  </div>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteIgnoreArea(area.id);
                                    }}
                                    className="mt-2 text-xs text-red-600 hover:text-red-700 hover:underline"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 min-w-0">
        <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-8xl relative">
          <DrawingCanvas
            backgroundImage={backgroundImage}
            stageRef={stageRef}
            canvasSizeX={canvasSizeX}
            canvasSizeY={canvasSizeY}
            stoneImages={stoneImages}
            setStoneImages={setStoneImages}
            selectedStoneId={selectedStoneId}
            setSelectedStoneId={setSelectedStoneId}
            onDeleteStone={handleDeleteStone}
            ignoreAreas={ignoreAreas}
            setIgnoreAreas={setIgnoreAreas}
            selectedIgnoreAreaId={selectedIgnoreAreaId}
            setSelectedIgnoreAreaId={setSelectedIgnoreAreaId}
            onDeleteIgnoreArea={handleDeleteIgnoreArea}
          />
        </div>
      </main>

      {/* Slab Selection Dialog */}
      {showSlabDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {slabDialogState === "select" ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Select Stone Slab
                  </h2>
                  <button
                    onClick={() => {
                      setShowSlabDialog(false);
                      setSlabDialogState("select");
                      setSlabDialogTab("new");
                      setSelectedSlabImage(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    <svg
                      className="w-6 h-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>

                {/* Tab Navigation */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    onClick={() => setSlabDialogTab("new")}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      slabDialogTab === "new"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    New Slabs
                  </button>
                  <button
                    onClick={() => setSlabDialogTab("used")}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                      slabDialogTab === "used"
                        ? "border-indigo-500 text-indigo-600"
                        : "border-transparent text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Used Slabs (
                    {(() => {
                      const usedSlabUrls = Array.from(
                        new Set(stoneImages.map((s) => s.originalImageUrl))
                      );
                      return usedSlabUrls.length;
                    })()}
                    )
                  </button>
                </div>

                {slabDialogTab === "new" ? (
                  <>
                    <p className="text-gray-600 mb-4">
                      Choose a stone slab to select a portion from:
                    </p>
                    <div className="grid grid-cols-3 gap-4">
                      {slabImages.map((slab) => (
                        <button
                          key={slab.id}
                          onClick={() => handleSlabImageClick(slab.url)}
                          className="relative rounded-lg border-2 border-gray-300 hover:border-indigo-500 overflow-hidden transition-all group"
                          style={{
                            aspectRatio: `${slab.exampleWidthMeters} / ${slab.exampleHeightMeters}`,
                          }}
                        >
                          <img
                            src={slab.url}
                            alt={slab.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              // If image doesn't exist, show placeholder
                              const target = e.target as HTMLImageElement;
                              target.src =
                                'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3E' +
                                slab.name +
                                "%3C/text%3E%3C/svg%3E";
                            }}
                          />
                          <div className="absolute inset-0 bg-indigo-500 bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                            <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                              {slab.name}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-4">
                      Select from previously used slabs (white areas show
                      already selected regions):
                    </p>
                    {(() => {
                      // Get unique slab URLs that have been used
                      const usedSlabUrls = Array.from(
                        new Set(stoneImages.map((s) => s.originalImageUrl))
                      );
                      const usedSlabs = slabImages.filter((slab) =>
                        usedSlabUrls.includes(slab.url)
                      );

                      if (usedSlabs.length === 0) {
                        return (
                          <div className="text-center py-8 text-gray-500">
                            No slabs have been used yet. Select from "New Slabs"
                            tab first.
                          </div>
                        );
                      }

                      return (
                        <div className="grid grid-cols-3 gap-4">
                          {usedSlabs.map((slab) => {
                            // Count how many selections from this slab
                            const selectionsFromSlab = stoneImages.filter(
                              (s) => s.originalImageUrl === slab.url
                            ).length;

                            return (
                              <button
                                key={slab.id}
                                onClick={() => handleSlabImageClick(slab.url)}
                                className="relative rounded-lg border-2 border-gray-300 hover:border-indigo-500 overflow-hidden transition-all group"
                                style={{
                                  aspectRatio: `${slab.exampleWidthMeters} / ${slab.exampleHeightMeters}`,
                                }}
                              >
                                <img
                                  src={slab.url}
                                  alt={slab.name}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src =
                                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3E' +
                                      slab.name +
                                      "%3C/text%3E%3C/svg%3E";
                                  }}
                                />
                                <div className="absolute inset-0 bg-indigo-500 bg-opacity-0 group-hover:bg-opacity-20 transition-opacity flex items-center justify-center">
                                  <span className="text-white font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
                                    {slab.name}
                                  </span>
                                </div>
                                {/* Badge showing number of selections */}
                                <div className="absolute top-2 right-2 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-full">
                                  {selectionsFromSlab} used
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </>
                )}
              </>
            ) : (
              <div className="flex gap-4">
                {/* Sidebar for shape and size selection */}
                <div className="w-64 flex-shrink-0 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Shape Selection
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedShape("rectangle");
                          if (shapePosition) {
                            updateCropSelectionFromShape(
                              shapePosition.x,
                              shapePosition.y
                            );
                          }
                        }}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedShape === "rectangle"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="w-full h-12 border-2 border-gray-600 rounded"></div>
                        <span className="text-xs mt-1 block text-center">
                          Rectangle
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedShape("circle");
                          if (shapePosition) {
                            updateCropSelectionFromShape(
                              shapePosition.x,
                              shapePosition.y
                            );
                          }
                        }}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedShape === "circle"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="w-full h-12 border-2 border-gray-600 rounded-full"></div>
                        <span className="text-xs mt-1 block text-center">
                          Circle
                        </span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedShape("triangle");
                          if (shapePosition) {
                            updateCropSelectionFromShape(
                              shapePosition.x,
                              shapePosition.y
                            );
                          }
                        }}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedShape === "triangle"
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        <div className="w-full h-12 flex items-end justify-center">
                          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-gray-600"></div>
                        </div>
                        <span className="text-xs mt-1 block text-center">
                          Triangle
                        </span>
                      </button>
                      {/* <button
                        onClick={() => {
                          setSelectedShape('cube');
                          if (shapePosition) {
                            updateCropSelectionFromShape(shapePosition.x, shapePosition.y);
                          }
                        }}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedShape === 'cube'
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="w-full h-12 flex items-center justify-center">
                          <div className="relative">
                            <div className="w-8 h-8 border-2 border-gray-600"></div>
                            <div className="absolute top-1 left-1 w-8 h-8 border-2 border-gray-400 opacity-50" style={{ transform: 'translate(4px, -4px)' }}></div>
                          </div>
                        </div>
                        <span className="text-xs mt-1 block text-center">Cube</span>
                      </button> */}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">
                      Size (in meters)
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Width (m)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={shapeWidth}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.1;
                            setShapeWidth(val);
                            if (shapePosition) {
                              updateCropSelectionFromShape(
                                shapePosition.x,
                                shapePosition.y
                              );
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Height (m)
                        </label>
                        <input
                          type="number"
                          min="0.1"
                          step="0.1"
                          value={shapeHeight}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0.1;
                            setShapeHeight(val);
                            if (shapePosition) {
                              updateCropSelectionFromShape(
                                shapePosition.x,
                                shapePosition.y
                              );
                            }
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main content area */}
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">
                      Select Part of Stone
                    </h2>
                    <button
                      onClick={() => {
                        setShowSlabDialog(false);
                        setSlabDialogState("select");
                        setSelectedSlabImage(null);
                        setCropSelection(null);
                        setShapePosition(null);
                      }}
                      className="text-gray-500 hover:text-gray-700 p-1"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                  <p className="text-gray-600 mb-4">
                    Click on the image to position the selected shape, or drag
                    the selection to move it:
                  </p>
                  <div
                    ref={slabContainerRef}
                    className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100"
                    onClick={(e) => {
                      // Don't handle click if we just finished dragging
                      if (justFinishedDraggingRef.current) {
                        justFinishedDraggingRef.current = false;
                        return;
                      }
                      if (isDraggingSelection) return;
                      if (!slabImageRef.current || !slabContainerRef.current)
                        return;
                      const containerRect =
                        e.currentTarget.getBoundingClientRect();
                      const imgRect =
                        slabImageRef.current.getBoundingClientRect();
                      const x = e.clientX - containerRect.left;
                      const y = e.clientY - containerRect.top;

                      // Check if click is within image bounds
                      const imgLeft = imgRect.left - containerRect.left;
                      const imgTop = imgRect.top - containerRect.top;
                      const imgRight = imgLeft + imgRect.width;
                      const imgBottom = imgTop + imgRect.height;

                      if (
                        x >= imgLeft &&
                        x <= imgRight &&
                        y >= imgTop &&
                        y <= imgBottom
                      ) {
                        const imgX = x - imgLeft;
                        const imgY = y - imgTop;
                        setShapePosition({ x: imgX, y: imgY });
                        updateCropSelectionFromShape(imgX, imgY);
                      }
                    }}
                    onMouseMove={(e) => {
                      if (
                        !slabImageRef.current ||
                        !slabContainerRef.current ||
                        !shapePosition ||
                        !cropSelection
                      )
                        return;

                      const containerRect =
                        e.currentTarget.getBoundingClientRect();
                      const imgRect =
                        slabImageRef.current.getBoundingClientRect();
                      const x = e.clientX - containerRect.left;
                      const y = e.clientY - containerRect.top;

                      // Calculate image bounds
                      const imgLeft = imgRect.left - containerRect.left;
                      const imgTop = imgRect.top - containerRect.top;
                      const imgDisplayWidth = imgRect.width;
                      const imgDisplayHeight = imgRect.height;

                      if (
                        isDraggingSelection &&
                        dragOffset &&
                        selectedSlabImage
                      ) {
                        // Find the selected slab image to get its size properties
                        const selectedSlab = slabImages.find(
                          (slab) => slab.url === selectedSlabImage
                        );
                        if (!selectedSlab) return;

                        // Calculate new position relative to image
                        const newImgX = x - imgLeft - dragOffset.x;
                        const newImgY = y - imgTop - dragOffset.y;

                        // Use the slab image's example size to calculate pixels-to-meters conversion
                        const pixelsToMetersX =
                          selectedSlab.exampleWidthMeters / imgDisplayWidth;
                        const pixelsToMetersY =
                          selectedSlab.exampleHeightMeters / imgDisplayHeight;
                        const widthInPixels = shapeWidth / pixelsToMetersX;
                        const heightInPixels = shapeHeight / pixelsToMetersY;

                        let halfWidth: number, halfHeight: number;
                        if (selectedShape === "circle") {
                          halfWidth =
                            Math.max(widthInPixels, heightInPixels) / 2;
                          halfHeight = halfWidth;
                        } else {
                          halfWidth = widthInPixels / 2;
                          halfHeight = heightInPixels / 2;
                        }

                        // Constrain to image bounds
                        const constrainedX = Math.max(
                          halfWidth,
                          Math.min(newImgX, imgDisplayWidth - halfWidth)
                        );
                        const constrainedY = Math.max(
                          halfHeight,
                          Math.min(newImgY, imgDisplayHeight - halfHeight)
                        );

                        // Update state for position and selection
                        setShapePosition({ x: constrainedX, y: constrainedY });
                        updateCropSelectionDirectly(constrainedX, constrainedY);
                      } else if (
                        isResizingSelection &&
                        resizeHandle &&
                        resizeStart
                      ) {
                        // Handle resizing
                        const imgX = x - imgLeft;
                        const imgY = y - imgTop;

                        let newWidth = resizeStart.width;
                        let newHeight = resizeStart.height;
                        let newCenterX = resizeStart.centerX;
                        let newCenterY = resizeStart.centerY;

                        // Calculate resize based on handle
                        if (resizeHandle.includes("e")) {
                          const diff =
                            imgX -
                            (resizeStart.centerX + resizeStart.width / 2);
                          newWidth = Math.max(20, resizeStart.width + diff * 2);
                        }
                        if (resizeHandle.includes("w")) {
                          const diff =
                            resizeStart.centerX - resizeStart.width / 2 - imgX;
                          newWidth = Math.max(20, resizeStart.width + diff * 2);
                          newCenterX = resizeStart.centerX - diff;
                        }
                        if (resizeHandle.includes("s")) {
                          const diff =
                            imgY -
                            (resizeStart.centerY + resizeStart.height / 2);
                          newHeight = Math.max(
                            20,
                            resizeStart.height + diff * 2
                          );
                        }
                        if (resizeHandle.includes("n")) {
                          const diff =
                            resizeStart.centerY - resizeStart.height / 2 - imgY;
                          newHeight = Math.max(
                            20,
                            resizeStart.height + diff * 2
                          );
                          newCenterY = resizeStart.centerY - diff;
                        }

                        // Constrain to image bounds
                        const halfWidth = newWidth / 2;
                        const halfHeight = newHeight / 2;
                        newCenterX = Math.max(
                          halfWidth,
                          Math.min(newCenterX, imgDisplayWidth - halfWidth)
                        );
                        newCenterY = Math.max(
                          halfHeight,
                          Math.min(newCenterY, imgDisplayHeight - halfHeight)
                        );

                        // Find the selected slab image to get its size properties
                        if (selectedSlabImage) {
                          const selectedSlab = slabImages.find(
                            (slab) => slab.url === selectedSlabImage
                          );
                          if (selectedSlab) {
                            // Use the slab image's example size to calculate pixels-to-meters conversion
                            const pixelsToMetersX =
                              selectedSlab.exampleWidthMeters / imgDisplayWidth;
                            const pixelsToMetersY =
                              selectedSlab.exampleHeightMeters /
                              imgDisplayHeight;

                            // Update width and height in meters
                            const newWidthMeters = newWidth * pixelsToMetersX;
                            const newHeightMeters = newHeight * pixelsToMetersY;

                            setShapeWidth(newWidthMeters);
                            setShapeHeight(newHeightMeters);
                            setShapePosition({ x: newCenterX, y: newCenterY });
                            updateCropSelectionDirectly(newCenterX, newCenterY);
                          }
                        }
                      }
                    }}
                    onMouseUp={() => {
                      // Only update if we were actually dragging or resizing
                      const wasDragging = isDraggingSelection;
                      const wasResizing = isResizingSelection;

                      // Mark that we just finished dragging to prevent click handler from firing
                      if (wasDragging || wasResizing) {
                        justFinishedDraggingRef.current = true;
                      }

                      setIsDraggingSelection(false);
                      setIsResizingSelection(false);
                      setDragOffset(null);
                      setResizeHandle(null);
                      setResizeStart(null);
                    }}
                    onMouseLeave={() => {
                      setIsDraggingSelection(false);
                      setIsResizingSelection(false);
                      setDragOffset(null);
                      setResizeHandle(null);
                      setResizeStart(null);
                    }}
                  >
                    <img
                      ref={slabImageRef}
                      src={selectedSlabImage || ""}
                      alt="Stone slab"
                      className="w-full pointer-events-none select-none"
                      style={{
                        aspectRatio: `${
                          slabImages.find((s) => s.url === selectedSlabImage)
                            ?.exampleWidthMeters || 1
                        } / ${
                          slabImages.find((s) => s.url === selectedSlabImage)
                            ?.exampleHeightMeters || 1
                        }`,
                        objectFit: "cover",
                      }}
                      draggable={false}
                      onDragStart={(e) => e.preventDefault()}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3EImage not found%3C/text%3E%3C/svg%3E';
                      }}
                    />
                    {/* Render existing selections as white blocked areas */}
                    {selectedSlabImage &&
                      slabImageRef.current &&
                      slabContainerRef.current &&
                      slabDialogTab === "used" &&
                      (() => {
                        const existingSelections =
                          getExistingSelectionsForSlab(selectedSlabImage);
                        if (existingSelections.length === 0) return null;

                        const containerRect =
                          slabContainerRef.current!.getBoundingClientRect();
                        const imgRect =
                          slabImageRef.current!.getBoundingClientRect();
                        const imgLeft = imgRect.left - containerRect.left;
                        const imgTop = imgRect.top - containerRect.top;
                        const imgDisplayWidth = imgRect.width;
                        const imgDisplayHeight = imgRect.height;

                        // Get natural image dimensions for scaling
                        const imgNaturalWidth =
                          slabImageRef.current!.naturalWidth;
                        const imgNaturalHeight =
                          slabImageRef.current!.naturalHeight;
                        const scaleX = imgDisplayWidth / imgNaturalWidth;
                        const scaleY = imgDisplayHeight / imgNaturalHeight;

                        return existingSelections.map((selection, index) => {
                          // Convert from natural coordinates to display coordinates
                          const displayLeft =
                            imgLeft +
                            Math.min(selection.startX, selection.endX) * scaleX;
                          const displayTop =
                            imgTop +
                            Math.min(selection.startY, selection.endY) * scaleY;
                          const displayWidth =
                            Math.abs(selection.endX - selection.startX) *
                            scaleX;
                          const displayHeight =
                            Math.abs(selection.endY - selection.startY) *
                            scaleY;

                          return (
                            <div
                              key={`existing-${index}`}
                              className="absolute bg-white border-2 border-gray-400 pointer-events-none"
                              style={{
                                left: `${displayLeft}px`,
                                top: `${displayTop}px`,
                                width: `${displayWidth}px`,
                                height: `${displayHeight}px`,
                                opacity: 0.85,
                              }}
                            >
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-gray-500 text-xs font-medium">
                                  USED
                                </span>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    {cropSelection &&
                      shapePosition &&
                      slabImageRef.current &&
                      slabContainerRef.current &&
                      (() => {
                        const containerRect =
                          slabContainerRef.current!.getBoundingClientRect();
                        const imgRect =
                          slabImageRef.current!.getBoundingClientRect();
                        const imgLeft = imgRect.left - containerRect.left;
                        const imgTop = imgRect.top - containerRect.top;

                        const selectionWidth = Math.abs(
                          cropSelection.endX - cropSelection.startX
                        );
                        const selectionHeight = Math.abs(
                          cropSelection.endY - cropSelection.startY
                        );
                        const selectionLeft =
                          imgLeft +
                          Math.min(cropSelection.startX, cropSelection.endX);
                        const selectionTop =
                          imgTop +
                          Math.min(cropSelection.startY, cropSelection.endY);
                        const centerX = imgLeft + shapePosition.x;
                        const centerY = imgTop + shapePosition.y;

                        return (
                          <>
                            {/* Shape overlay based on selected shape */}
                            {selectedShape === "circle" && (
                              <div
                                ref={
                                  selectionOverlayRef as React.RefObject<HTMLDivElement>
                                }
                                className="absolute border-2 border-indigo-500 bg-indigo-500 bg-opacity-20 rounded-full cursor-move"
                                style={{
                                  left: `${selectionLeft}px`,
                                  top: `${selectionTop}px`,
                                  width: `${selectionWidth}px`,
                                  height: `${selectionWidth}px`,
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  if (
                                    !slabImageRef.current ||
                                    !slabContainerRef.current
                                  )
                                    return;
                                  const containerRect =
                                    slabContainerRef.current.getBoundingClientRect();
                                  const imgRect =
                                    slabImageRef.current.getBoundingClientRect();
                                  const imgLeft =
                                    imgRect.left - containerRect.left;
                                  const imgTop =
                                    imgRect.top - containerRect.top;

                                  const mouseX = e.clientX - containerRect.left;
                                  const mouseY = e.clientY - containerRect.top;
                                  const imgX = mouseX - imgLeft;
                                  const imgY = mouseY - imgTop;

                                  setDragOffset({
                                    x: imgX - shapePosition.x,
                                    y: imgY - shapePosition.y,
                                  });
                                  setIsDraggingSelection(true);
                                }}
                              />
                            )}
                            {selectedShape === "triangle" && (
                              <svg
                                ref={
                                  selectionOverlayRef as React.RefObject<SVGSVGElement>
                                }
                                className="absolute cursor-move"
                                style={{
                                  left: `${selectionLeft}px`,
                                  top: `${selectionTop}px`,
                                  width: `${selectionWidth}px`,
                                  height: `${selectionHeight}px`,
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  if (
                                    !slabImageRef.current ||
                                    !slabContainerRef.current
                                  )
                                    return;
                                  const containerRect =
                                    slabContainerRef.current.getBoundingClientRect();
                                  const imgRect =
                                    slabImageRef.current.getBoundingClientRect();
                                  const imgLeft =
                                    imgRect.left - containerRect.left;
                                  const imgTop =
                                    imgRect.top - containerRect.top;

                                  const mouseX = e.clientX - containerRect.left;
                                  const mouseY = e.clientY - containerRect.top;
                                  const imgX = mouseX - imgLeft;
                                  const imgY = mouseY - imgTop;

                                  setDragOffset({
                                    x: imgX - shapePosition.x,
                                    y: imgY - shapePosition.y,
                                  });
                                  setIsDraggingSelection(true);
                                }}
                              >
                                <polygon
                                  points={`${
                                    selectionWidth / 2
                                  },0 ${selectionWidth},${selectionHeight} 0,${selectionHeight}`}
                                  fill="rgba(99, 102, 241, 0.2)"
                                  stroke="rgb(99, 102, 241)"
                                  strokeWidth="2"
                                />
                              </svg>
                            )}
                            {(selectedShape === "rectangle" ||
                              selectedShape === "cube") && (
                              <div
                                ref={
                                  selectionOverlayRef as React.RefObject<HTMLDivElement>
                                }
                                className="absolute border-2 border-indigo-500 bg-indigo-500 bg-opacity-20 cursor-move"
                                style={{
                                  left: `${selectionLeft}px`,
                                  top: `${selectionTop}px`,
                                  width: `${selectionWidth}px`,
                                  height: `${selectionHeight}px`,
                                }}
                                onMouseDown={(e) => {
                                  e.stopPropagation();
                                  if (
                                    !slabImageRef.current ||
                                    !slabContainerRef.current
                                  )
                                    return;
                                  const containerRect =
                                    slabContainerRef.current.getBoundingClientRect();
                                  const imgRect =
                                    slabImageRef.current.getBoundingClientRect();
                                  const imgLeft =
                                    imgRect.left - containerRect.left;
                                  const imgTop =
                                    imgRect.top - containerRect.top;

                                  const mouseX = e.clientX - containerRect.left;
                                  const mouseY = e.clientY - containerRect.top;
                                  const imgX = mouseX - imgLeft;
                                  const imgY = mouseY - imgTop;

                                  setDragOffset({
                                    x: imgX - shapePosition.x,
                                    y: imgY - shapePosition.y,
                                  });
                                  setIsDraggingSelection(true);
                                }}
                              />
                            )}
                            {/* Width label on top edge (outside) */}
                            <div
                              className="absolute pointer-events-none text-sm font-bold text-indigo-600"
                              style={{
                                left: `${centerX}px`,
                                top: `${selectionTop - 20}px`,
                                transform: "translateX(-50%)",
                              }}
                            >
                              {shapeWidth.toFixed(3)} m
                            </div>
                            {/* Height label on right edge (outside) */}
                            <div
                              className="absolute pointer-events-none text-sm font-bold text-indigo-600"
                              style={{
                                left: `${
                                  selectionLeft + selectionWidth + 10
                                }px`,
                                top: `${centerY}px`,
                                transform: "translateY(-50%) rotate(90deg)",
                                transformOrigin: "center",
                              }}
                            >
                              {shapeHeight.toFixed(3)} m
                            </div>
                            {/* Resize handles */}
                            {["nw", "ne", "sw", "se", "n", "s", "e", "w"].map(
                              (handle) => {
                                const handleStyle: React.CSSProperties = {
                                  position: "absolute",
                                  width: "10px",
                                  height: "10px",
                                  backgroundColor: "#3B82F6",
                                  border: "2px solid #1E40AF",
                                  borderRadius: "2px",
                                  cursor:
                                    handle === "nw" || handle === "se"
                                      ? "nwse-resize"
                                      : handle === "ne" || handle === "sw"
                                      ? "nesw-resize"
                                      : handle === "n" || handle === "s"
                                      ? "ns-resize"
                                      : "ew-resize",
                                  zIndex: 10,
                                };

                                if (handle.includes("w"))
                                  handleStyle.left = `${selectionLeft - 5}px`;
                                if (handle.includes("e"))
                                  handleStyle.left = `${
                                    selectionLeft + selectionWidth - 5
                                  }px`;
                                if (handle.includes("n"))
                                  handleStyle.top = `${selectionTop - 5}px`;
                                if (handle.includes("s"))
                                  handleStyle.top = `${
                                    selectionTop + selectionHeight - 5
                                  }px`;
                                if (
                                  !handle.includes("w") &&
                                  !handle.includes("e")
                                )
                                  handleStyle.left = `${
                                    selectionLeft + selectionWidth / 2 - 5
                                  }px`;
                                if (
                                  !handle.includes("n") &&
                                  !handle.includes("s")
                                )
                                  handleStyle.top = `${
                                    selectionTop + selectionHeight / 2 - 5
                                  }px`;

                                return (
                                  <div
                                    key={handle}
                                    style={handleStyle}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      if (!shapePosition || !cropSelection)
                                        return;

                                      setResizeHandle(handle);
                                      setResizeStart({
                                        x: e.clientX,
                                        y: e.clientY,
                                        width: selectionWidth,
                                        height: selectionHeight,
                                        centerX: shapePosition.x,
                                        centerY: shapePosition.y,
                                      });
                                      setIsResizingSelection(true);
                                    }}
                                  />
                                );
                              }
                            )}
                          </>
                        );
                      })()}
                  </div>
                  <div className="flex gap-4 justify-end mt-4">
                    <button
                      onClick={handleBackToSlabSelection}
                      className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Back
                    </button>
                    {(() => {
                      // Check if current selection overlaps with existing selections (only for "used" tab)
                      let hasOverlap = false;
                      let overlapMessage = "";

                      if (
                        slabDialogTab === "used" &&
                        cropSelection &&
                        selectedSlabImage &&
                        slabImageRef.current
                      ) {
                        const existingSelections =
                          getExistingSelectionsForSlab(selectedSlabImage);

                        if (existingSelections.length > 0) {
                          // Convert current selection to natural coordinates for comparison
                          const img = slabImageRef.current;
                          const imgRect = img.getBoundingClientRect();
                          const scaleX = img.naturalWidth / imgRect.width;
                          const scaleY = img.naturalHeight / imgRect.height;

                          const naturalSelection = {
                            startX:
                              Math.min(
                                cropSelection.startX,
                                cropSelection.endX
                              ) * scaleX,
                            startY:
                              Math.min(
                                cropSelection.startY,
                                cropSelection.endY
                              ) * scaleY,
                            endX:
                              Math.max(
                                cropSelection.startX,
                                cropSelection.endX
                              ) * scaleX,
                            endY:
                              Math.max(
                                cropSelection.startY,
                                cropSelection.endY
                              ) * scaleY,
                          };

                          hasOverlap = checkSelectionOverlap(
                            naturalSelection,
                            existingSelections
                          );
                          if (hasOverlap) {
                            overlapMessage =
                              "Selection overlaps with existing area";
                          }
                        }
                      }

                      return (
                        <div className="flex flex-col items-end gap-1">
                          <button
                            onClick={handleAddCropToCanvas}
                            disabled={!cropSelection || hasOverlap}
                            className={`px-6 py-2 rounded-lg transition-colors font-medium ${
                              hasOverlap
                                ? "bg-red-400 text-white cursor-not-allowed"
                                : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                            }`}
                            title={hasOverlap ? overlapMessage : ""}
                          >
                            {hasOverlap ? "Overlap Detected" : "Confirm"}
                          </button>
                          {hasOverlap && (
                            <span className="text-xs text-red-500">
                              {overlapMessage}
                            </span>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Stone View Dialog */}
      {showStoneViewDialog && viewingStone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex">
            {/* Sidebar */}
            <div className="w-64 flex-shrink-0 p-4 border-r border-gray-200 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800">Stone Area</h2>
                <button
                  onClick={() => {
                    setShowStoneViewDialog(false);
                    setViewingStone(null);
                  }}
                  className="text-gray-500 hover:text-gray-700 p-1"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Drag the selection to reposition on the slab.
              </p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  Stone Information
                </h3>
                <div className="text-sm text-gray-600 space-y-1">
                  {(() => {
                    const maxDisplaySize = 1200;
                    const aspectRatio = canvasSizeX / canvasSizeY;
                    let canvasWidth = 800;
                    let canvasHeight = 600;

                    if (aspectRatio >= 1) {
                      canvasWidth = Math.min(maxDisplaySize, 800);
                      canvasHeight = canvasWidth / aspectRatio;
                    } else {
                      canvasHeight = Math.min(maxDisplaySize, 600);
                      canvasWidth = canvasHeight * aspectRatio;
                    }

                    if (canvasWidth < 400) {
                      canvasWidth = 400;
                      canvasHeight = canvasWidth / aspectRatio;
                    }
                    if (canvasHeight < 300) {
                      canvasHeight = 300;
                      canvasWidth = canvasHeight * aspectRatio;
                    }

                    const pixelsToMetersX = canvasSizeX / canvasWidth;
                    const pixelsToMetersY = canvasSizeY / canvasHeight;
                    const distanceLeft = viewingStone.x * pixelsToMetersX;
                    const distanceTop = viewingStone.y * pixelsToMetersY;

                    const selectedSlab = slabImages.find(
                      (slab) => slab.url === viewingStone.originalImageUrl
                    );
                    const sizeInMeters = selectedSlab
                      ? {
                          width: viewingStone.width * pixelsToMetersX,
                          height: viewingStone.height * pixelsToMetersY,
                        }
                      : null;

                    return (
                      <>
                        <div>Left: {distanceLeft.toFixed(3)}m</div>
                        <div>Top: {distanceTop.toFixed(3)}m</div>
                        <div>
                          Rotation: {Math.round(viewingStone.rotation)}°
                        </div>
                        {sizeInMeters && (
                          <>
                            <div>Width: {sizeInMeters.width.toFixed(3)}m</div>
                            <div>Height: {sizeInMeters.height.toFixed(3)}m</div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>

            {/* Image Section */}
            <div className="flex-1 p-4 overflow-auto">
              <div
                ref={viewStoneContainerRef}
                className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100 max-h-[100vh]"
                onMouseMove={(e) => {
                  if (
                    !viewStoneImageRef.current ||
                    !viewStoneContainerRef.current ||
                    !viewingStone ||
                    !cropOverlayStyle
                  )
                    return;

                  const containerRect = e.currentTarget.getBoundingClientRect();
                  const imgRect =
                    viewStoneImageRef.current.getBoundingClientRect();
                  const imgLeft = imgRect.left - containerRect.left;
                  const imgTop = imgRect.top - containerRect.top;
                  const imgDisplayWidth = imgRect.width;
                  const imgDisplayHeight = imgRect.height;

                  if (isDraggingViewOverlay && viewDragOffset) {
                    const x = e.clientX - containerRect.left;
                    const y = e.clientY - containerRect.top;

                    const newLeft = x - viewDragOffset.x;
                    const newTop = y - viewDragOffset.y;

                    // Parse current overlay dimensions
                    const currentWidth = parseFloat(cropOverlayStyle.width);
                    const currentHeight = parseFloat(cropOverlayStyle.height);

                    // Constrain to image bounds
                    const constrainedLeft = Math.max(
                      imgLeft,
                      Math.min(
                        newLeft,
                        imgLeft + imgDisplayWidth - currentWidth
                      )
                    );
                    const constrainedTop = Math.max(
                      imgTop,
                      Math.min(
                        newTop,
                        imgTop + imgDisplayHeight - currentHeight
                      )
                    );

                    setCropOverlayStyle({
                      left: `${constrainedLeft}px`,
                      top: `${constrainedTop}px`,
                      width: cropOverlayStyle.width,
                      height: cropOverlayStyle.height,
                    });
                  }
                }}
                onMouseUp={() => {
                  if (isDraggingViewOverlay) {
                    // Update the viewingStone's cropSelection and recrop the image (preserve size, only change position)
                    if (
                      viewStoneImageRef.current &&
                      viewStoneContainerRef.current &&
                      viewingStone &&
                      cropOverlayStyle
                    ) {
                      const img = viewStoneImageRef.current;
                      const containerRect =
                        viewStoneContainerRef.current.getBoundingClientRect();
                      const imgRect = img.getBoundingClientRect();
                      const imgNaturalWidth = img.naturalWidth;
                      const imgNaturalHeight = img.naturalHeight;
                      const imgDisplayWidth = imgRect.width;
                      const imgDisplayHeight = imgRect.height;

                      // Calculate scale factors
                      const scaleX = imgNaturalWidth / imgDisplayWidth;
                      const scaleY = imgNaturalHeight / imgDisplayHeight;

                      // Get overlay position relative to image
                      const imgLeft = imgRect.left - containerRect.left;
                      const imgTop = imgRect.top - containerRect.top;
                      const overlayLeft =
                        parseFloat(cropOverlayStyle.left) - imgLeft;
                      const overlayTop =
                        parseFloat(cropOverlayStyle.top) - imgTop;

                      // Preserve the original crop size (don't change it)
                      const originalCropWidth =
                        viewingStone.cropSelection.endX -
                        viewingStone.cropSelection.startX;
                      const originalCropHeight =
                        viewingStone.cropSelection.endY -
                        viewingStone.cropSelection.startY;

                      // Calculate new crop position in natural image coordinates
                      const newStartX = overlayLeft * scaleX;
                      const newStartY = overlayTop * scaleY;
                      const newEndX = newStartX + originalCropWidth;
                      const newEndY = newStartY + originalCropHeight;

                      const cropWidth = originalCropWidth;
                      const cropHeight = originalCropHeight;

                      // Create a canvas to crop the image
                      const canvas = document.createElement("canvas");
                      canvas.width = cropWidth;
                      canvas.height = cropHeight;
                      const ctx = canvas.getContext("2d");
                      if (ctx) {
                        // Draw the cropped portion
                        ctx.drawImage(
                          img,
                          newStartX,
                          newStartY,
                          cropWidth,
                          cropHeight,
                          0,
                          0,
                          cropWidth,
                          cropHeight
                        );

                        // Convert to data URL
                        const croppedDataURL = canvas.toDataURL("image/png");

                        // Update the stone image - preserve size, only update position and imageData
                        const updatedStone: StoneImage = {
                          ...viewingStone,
                          imageData: croppedDataURL,
                          // Keep original width and height (don't change size)
                          cropSelection: {
                            startX: newStartX,
                            startY: newStartY,
                            endX: newEndX,
                            endY: newEndY,
                          },
                        };

                        setViewingStone(updatedStone);

                        // Update stoneImages array
                        setStoneImages(
                          stoneImages.map((s) =>
                            s.id === viewingStone.id ? updatedStone : s
                          )
                        );
                      }
                    }
                  }
                  setIsDraggingViewOverlay(false);
                  setViewDragOffset(null);
                }}
                onMouseLeave={() => {
                  setIsDraggingViewOverlay(false);
                  setViewDragOffset(null);
                }}
              >
                <img
                  ref={viewStoneImageRef}
                  src={viewingStone.originalImageUrl}
                  alt="Original stone slab"
                  className="w-full pointer-events-none select-none"
                  style={{
                    aspectRatio: `${
                      slabImages.find(
                        (s) => s.url === viewingStone.originalImageUrl
                      )?.exampleWidthMeters || 1
                    } / ${
                      slabImages.find(
                        (s) => s.url === viewingStone.originalImageUrl
                      )?.exampleHeightMeters || 1
                    }`,
                    objectFit: "cover",
                  }}
                  draggable={false}
                  onDragStart={(e) => e.preventDefault()}
                  onLoad={() => {
                    if (
                      viewStoneImageRef.current &&
                      viewStoneContainerRef.current &&
                      viewingStone
                    ) {
                      const containerRect =
                        viewStoneContainerRef.current.getBoundingClientRect();
                      const imgRect =
                        viewStoneImageRef.current.getBoundingClientRect();
                      const imgLeft = imgRect.left - containerRect.left;
                      const imgTop = imgRect.top - containerRect.top;
                      const imgDisplayWidth = imgRect.width;
                      const imgDisplayHeight = imgRect.height;
                      const imgNaturalWidth =
                        viewStoneImageRef.current.naturalWidth;
                      const imgNaturalHeight =
                        viewStoneImageRef.current.naturalHeight;

                      // Calculate the scale factor from natural to display
                      const scaleX = imgDisplayWidth / imgNaturalWidth;
                      const scaleY = imgDisplayHeight / imgNaturalHeight;

                      // Convert cropSelection from natural image coordinates to current display coordinates
                      const displayStartX =
                        viewingStone.cropSelection.startX * scaleX;
                      const displayStartY =
                        viewingStone.cropSelection.startY * scaleY;
                      const displayEndX =
                        viewingStone.cropSelection.endX * scaleX;
                      const displayEndY =
                        viewingStone.cropSelection.endY * scaleY;

                      setCropOverlayStyle({
                        left: `${imgLeft + displayStartX}px`,
                        top: `${imgTop + displayStartY}px`,
                        width: `${displayEndX - displayStartX}px`,
                        height: `${displayEndY - displayStartY}px`,
                      });
                    }
                  }}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3EImage not found%3C/text%3E%3C/svg%3E';
                  }}
                />
                {cropOverlayStyle && (
                  <>
                    {/* Selection overlay with handles */}
                    <div
                      className="absolute cursor-move"
                      style={{
                        ...cropOverlayStyle,
                        border: "2px solid #6366f1",
                        backgroundColor: "rgba(99, 102, 241, 0.15)",
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        if (
                          !viewStoneImageRef.current ||
                          !viewStoneContainerRef.current ||
                          !cropOverlayStyle
                        )
                          return;
                        const containerRect =
                          viewStoneContainerRef.current.getBoundingClientRect();
                        const mouseX = e.clientX - containerRect.left;
                        const mouseY = e.clientY - containerRect.top;
                        const overlayLeft = parseFloat(cropOverlayStyle.left);
                        const overlayTop = parseFloat(cropOverlayStyle.top);

                        setViewDragOffset({
                          x: mouseX - overlayLeft,
                          y: mouseY - overlayTop,
                        });
                        setIsDraggingViewOverlay(true);
                      }}
                    >
                      {/* Dimension labels */}
                      {(() => {
                        const maxDisplaySize = 1200;
                        const aspectRatio = canvasSizeX / canvasSizeY;
                        let canvasWidth = 800;
                        let canvasHeight = 600;
                        if (aspectRatio >= 1) {
                          canvasWidth = Math.min(maxDisplaySize, 800);
                          canvasHeight = canvasWidth / aspectRatio;
                        } else {
                          canvasHeight = Math.min(maxDisplaySize, 600);
                          canvasWidth = canvasHeight * aspectRatio;
                        }
                        if (canvasWidth < 400) {
                          canvasWidth = 400;
                          canvasHeight = canvasWidth / aspectRatio;
                        }
                        if (canvasHeight < 300) {
                          canvasHeight = 300;
                          canvasWidth = canvasHeight * aspectRatio;
                        }
                        const pixelsToMetersX = canvasSizeX / canvasWidth;
                        const pixelsToMetersY = canvasSizeY / canvasHeight;
                        const widthM = viewingStone.width * pixelsToMetersX;
                        const heightM = viewingStone.height * pixelsToMetersY;

                        return (
                          <>
                            {/* Top label (width) */}
                            <div
                              className="absolute left-1/2 -translate-x-1/2 -top-6 text-sm font-semibold text-indigo-500 whitespace-nowrap"
                              style={{
                                textShadow: "0 0 3px white, 0 0 3px white",
                              }}
                            >
                              {widthM.toFixed(3)} m
                            </div>
                            {/* Right label (height) */}
                            <div
                              className="absolute top-1/2 -right-2 translate-x-full -translate-y-1/2 text-sm font-semibold text-indigo-500 whitespace-nowrap"
                              style={{
                                writingMode: "vertical-rl",
                                textShadow: "0 0 3px white, 0 0 3px white",
                              }}
                            >
                              {heightM.toFixed(3)} m
                            </div>
                          </>
                        );
                      })()}

                      {/* Corner handles */}
                      <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-indigo-500 border border-white" />
                      <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-indigo-500 border border-white" />
                      <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-indigo-500 border border-white" />
                      <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-indigo-500 border border-white" />

                      {/* Edge handles */}
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-500 border border-white" />
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-indigo-500 border border-white" />
                      <div className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3 h-3 bg-indigo-500 border border-white" />
                      <div className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3 h-3 bg-indigo-500 border border-white" />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ignore Area Dialog */}
      {showIgnoreAreaDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">
                Add Ignore Area
              </h2>
              <button
                onClick={() => setShowIgnoreAreaDialog(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Create a white rectangle that will be ignored during SVG and
              G-code generation.
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Width (meters)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={ignoreAreaWidth}
                  onChange={(e) =>
                    setIgnoreAreaWidth(parseFloat(e.target.value) || 0.1)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (meters)
                </label>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  value={ignoreAreaHeight}
                  onChange={(e) =>
                    setIgnoreAreaHeight(parseFloat(e.target.value) || 0.1)
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => setShowIgnoreAreaDialog(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddIgnoreArea}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
              >
                Add Ignore Area
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
