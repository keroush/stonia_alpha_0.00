'use client';

import { useRef, useState, useEffect } from 'react';
import DrawingCanvas from '@/components/DrawingCanvas';

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

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [selectedStoneImage, setSelectedStoneImage] = useState<string | null>(null);
  const [showSlabDialog, setShowSlabDialog] = useState(false);
  const [slabDialogState, setSlabDialogState] = useState<'select' | 'crop'>('select');
  const [selectedSlabImage, setSelectedSlabImage] = useState<string | null>(null);
  const [cropSelection, setCropSelection] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isDraggingSelection, setIsDraggingSelection] = useState(false);
  const [isResizingSelection, setIsResizingSelection] = useState(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number; centerX: number; centerY: number } | null>(null);
  const slabImageRef = useRef<HTMLImageElement | null>(null);
  const slabContainerRef = useRef<HTMLDivElement | null>(null);

  // Shape selection state
  const [selectedShape, setSelectedShape] = useState<'rectangle' | 'circle' | 'triangle' | 'cube'>('rectangle');
  const [shapeWidth, setShapeWidth] = useState<number>(1.0); // in meters
  const [shapeHeight, setShapeHeight] = useState<number>(1.0); // in meters
  const [shapePosition, setShapePosition] = useState<{ x: number; y: number } | null>(null);
  
  // Canvas size state (in meters)
  const [canvasSizeX, setCanvasSizeX] = useState<number>(5);
  const [canvasSizeY, setCanvasSizeY] = useState<number>(5);
  
  // Stone images on canvas
  const [stoneImages, setStoneImages] = useState<StoneImage[]>([]);
  const [selectedStoneId, setSelectedStoneId] = useState<string | null>(null);
  const [showStoneViewDialog, setShowStoneViewDialog] = useState(false);
  const [viewingStone, setViewingStone] = useState<StoneImage | null>(null);
  const viewStoneImageRef = useRef<HTMLImageElement | null>(null);
  const viewStoneContainerRef = useRef<HTMLDivElement | null>(null);
  const [cropOverlayStyle, setCropOverlayStyle] = useState<{ left: string; top: string; width: string; height: string } | null>(null);
  const [isDraggingViewOverlay, setIsDraggingViewOverlay] = useState(false);
  const [viewDragOffset, setViewDragOffset] = useState<{ x: number; y: number } | null>(null);
  const [viewSelectionModified, setViewSelectionModified] = useState(false);
  
  // Canvas state
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const stageRef = useRef<any>(null);

  const handleDeleteStone = (id: string) => {
    setStoneImages(stoneImages.filter(stone => stone.id !== id));
    if (selectedStoneId === id) {
      setSelectedStoneId(null);
    }
  };

  const generateGCode = () => {
    if (stoneImages.length === 0) {
      alert('No stone images to generate G-code for.');
      return;
    }

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
      let gcode = '; G-code generated for stone cutting\n';
      gcode += '; Stone ' + (index + 1) + ' (ID: ' + stone.id + ')\n';
      gcode += '; Position: X=' + xPosMeters.toFixed(3) + 'm, Y=' + yPosMeters.toFixed(3) + 'm\n';
      gcode += '; Size: W=' + widthMeters.toFixed(3) + 'm, H=' + heightMeters.toFixed(3) + 'm\n';
      gcode += '; Rotation: ' + Math.round(stone.rotation) + ' degrees\n';
      gcode += ';\n';
      gcode += 'G21 ; Set units to millimeters\n';
      gcode += 'G90 ; Set to absolute positioning\n';
      gcode += 'G28 ; Home all axes\n';
      gcode += ';\n';
      
      // Move to position
      gcode += 'G0 X' + xPosMM.toFixed(2) + ' Y' + yPosMM.toFixed(2) + ' ; Move to stone position\n';
      
      // Apply rotation (if supported by machine)
      if (Math.abs(stone.rotation) > 0.1) {
        gcode += 'G68 X' + xPosMM.toFixed(2) + ' Y' + yPosMM.toFixed(2) + ' R' + stone.rotation.toFixed(2) + ' ; Rotate coordinate system\n';
      }
      
      // Cut rectangle based on stone size (starting from center, cutting outward)
      const halfWidth = widthMM / 2;
      const halfHeight = heightMM / 2;
      
      gcode += 'G0 X' + (xPosMM - halfWidth).toFixed(2) + ' Y' + (yPosMM - halfHeight).toFixed(2) + ' ; Move to start position (bottom-left)\n';
      gcode += 'G1 Z-5 F100 ; Lower tool (adjust Z and feed rate as needed)\n';
      gcode += 'G1 X' + (xPosMM + halfWidth).toFixed(2) + ' Y' + (yPosMM - halfHeight).toFixed(2) + ' F500 ; Cut to right\n';
      gcode += 'G1 X' + (xPosMM + halfWidth).toFixed(2) + ' Y' + (yPosMM + halfHeight).toFixed(2) + ' F500 ; Cut to top\n';
      gcode += 'G1 X' + (xPosMM - halfWidth).toFixed(2) + ' Y' + (yPosMM + halfHeight).toFixed(2) + ' F500 ; Cut to left\n';
      gcode += 'G1 X' + (xPosMM - halfWidth).toFixed(2) + ' Y' + (yPosMM - halfHeight).toFixed(2) + ' F500 ; Cut to bottom (close rectangle)\n';
      gcode += 'G0 Z5 ; Raise tool\n';
      
      // Reset rotation if applied
      if (Math.abs(stone.rotation) > 0.1) {
        gcode += 'G69 ; Cancel rotation\n';
      }
      
      gcode += ';\n';
      gcode += 'G28 ; Home all axes\n';
      gcode += 'M30 ; Program end and rewind\n';

      // Create and download the file for this stone
      const blob = new Blob([gcode], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // File name includes stone index and size in meters
      const fileName = `stone_${index + 1}_${widthMeters.toFixed(3)}m_x_${heightMeters.toFixed(3)}m_${new Date().toISOString().split('T')[0]}.gcode`;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    });
  };



  // Stone slab images with example size properties (in meters)
  const slabImages = [
    { id: 'stone1', name: 'Stone 1', url: '/images/stone.1.png', exampleWidthMeters: 2.5, exampleHeightMeters: 1.8 },
    { id: 'stone2', name: 'Stone 2', url: '/images/stone.2.png', exampleWidthMeters: 3.0, exampleHeightMeters: 2.0 },
    { id: 'stone3', name: 'Stone 3', url: '/images/stone.3.png', exampleWidthMeters: 2.8, exampleHeightMeters: 1.9 },
  ];

  const handleSlabImageClick = (url: string) => {
    setSelectedSlabImage(url);
    setSlabDialogState('crop');
    setCropSelection(null);
    setShapePosition(null);
  };

  // Function to update crop selection based on shape and size
  const updateCropSelectionFromShape = (centerX: number, centerY: number, updatePosition: boolean = true) => {
    if (!slabImageRef.current || !slabContainerRef.current || !selectedSlabImage) return;
    
    const imgRect = slabImageRef.current.getBoundingClientRect();
    const imgDisplayWidth = imgRect.width;
    const imgDisplayHeight = imgRect.height;
    
    // Find the selected slab image to get its size properties
    const selectedSlab = slabImages.find(slab => slab.url === selectedSlabImage);
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
    
    if (selectedShape === 'circle') {
      // For circle, use the larger dimension
      const radius = Math.max(widthInPixels, heightInPixels) / 2;
      startX = centerX - radius;
      startY = centerY - radius;
      endX = centerX + radius;
      endY = centerY + radius;
    } else if (selectedShape === 'triangle') {
      // For triangle, use height as the triangle height
      const triangleHeight = heightInPixels;
      const triangleWidth = widthInPixels;
      startX = centerX - triangleWidth / 2;
      startY = centerY - triangleHeight / 2;
      endX = centerX + triangleWidth / 2;
      endY = centerY + triangleHeight / 2;
    } else if (selectedShape === 'cube') {
      // For cube, use width and height
      startX = centerX - widthInPixels / 2;
      startY = centerY - heightInPixels / 2;
      endX = centerX + widthInPixels / 2;
      endY = centerY + heightInPixels / 2;
    } else {
      // Rectangle (default)
      startX = centerX - widthInPixels / 2;
      startY = centerY - heightInPixels / 2;
      endX = centerX + widthInPixels / 2;
      endY = centerY + heightInPixels / 2;
    }
    
    // Clamp to image bounds (using display dimensions)
    const halfWidth = Math.abs(endX - startX) / 2;
    const halfHeight = Math.abs(endY - startY) / 2;
    
    // Constrain center position to keep selection within bounds
    const constrainedCenterX = Math.max(halfWidth, Math.min(centerX, imgDisplayWidth - halfWidth));
    const constrainedCenterY = Math.max(halfHeight, Math.min(centerY, imgDisplayHeight - halfHeight));
    
    // Recalculate bounds with constrained center
    if (selectedShape === 'circle') {
      const radius = Math.max(widthInPixels, heightInPixels) / 2;
      startX = constrainedCenterX - radius;
      startY = constrainedCenterY - radius;
      endX = constrainedCenterX + radius;
      endY = constrainedCenterY + radius;
    } else if (selectedShape === 'triangle') {
      const triangleHeight = heightInPixels;
      const triangleWidth = widthInPixels;
      startX = constrainedCenterX - triangleWidth / 2;
      startY = constrainedCenterY - triangleHeight / 2;
      endX = constrainedCenterX + triangleWidth / 2;
      endY = constrainedCenterY + triangleHeight / 2;
    } else {
      startX = constrainedCenterX - widthInPixels / 2;
      startY = constrainedCenterY - heightInPixels / 2;
      endX = constrainedCenterX + widthInPixels / 2;
      endY = constrainedCenterY + heightInPixels / 2;
    }
    
    // Final clamp to ensure bounds are within image
    startX = Math.max(0, Math.min(startX, imgDisplayWidth));
    startY = Math.max(0, Math.min(startY, imgDisplayHeight));
    endX = Math.max(0, Math.min(endX, imgDisplayWidth));
    endY = Math.max(0, Math.min(endY, imgDisplayHeight));
    
    // Update shape position to match constrained center (only if requested and it changed)
    if (updatePosition && (constrainedCenterX !== centerX || constrainedCenterY !== centerY)) {
      setShapePosition({ x: constrainedCenterX, y: constrainedCenterY });
    }
    setCropSelection({ startX, startY, endX, endY });
  };

  // Update selection size immediately when width/height changes
  useEffect(() => {
    if (shapePosition && slabImageRef.current && slabContainerRef.current && !isDraggingSelection) {
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
    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      startX, startY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    // Convert to data URL and add to canvas as a draggable stone image
    const croppedDataURL = canvas.toDataURL('image/png');
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
    
    // Add to canvas stone images array (positioned at center initially)
    const newStoneImage: StoneImage = {
      id: `stone-${Date.now()}`,
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
    setSlabDialogState('select');
    setSelectedSlabImage(null);
    setCropSelection(null);
  };

  const handleConfirmViewSelectionChange = () => {
    if (!viewingStone || !viewStoneImageRef.current || !viewStoneContainerRef.current || !cropOverlayStyle) return;

    const img = viewStoneImageRef.current;
    const containerRect = viewStoneContainerRef.current.getBoundingClientRect();
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
    const overlayLeft = parseFloat(cropOverlayStyle.left) - imgLeft;
    const overlayTop = parseFloat(cropOverlayStyle.top) - imgTop;
    
    // Preserve the original crop size (don't change it)
    const originalCropWidth = viewingStone.cropSelection.endX - viewingStone.cropSelection.startX;
    const originalCropHeight = viewingStone.cropSelection.endY - viewingStone.cropSelection.startY;

    // Calculate crop coordinates in natural image space (preserve size, only change position)
    const startX = overlayLeft * scaleX;
    const startY = overlayTop * scaleY;
    const endX = startX + originalCropWidth;
    const endY = startY + originalCropHeight;

    const cropWidth = originalCropWidth;
    const cropHeight = originalCropHeight;

    // Create a canvas to crop the image
    const canvas = document.createElement('canvas');
    canvas.width = cropWidth;
    canvas.height = cropHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw the cropped portion
    ctx.drawImage(
      img,
      startX, startY, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    // Convert to data URL
    const croppedDataURL = canvas.toDataURL('image/png');

    // Update the stone image - preserve size, only update position and imageData
    const updatedStone: StoneImage = {
      ...viewingStone,
      imageData: croppedDataURL,
      // Keep original width and height (don't change size)
      cropSelection: {
        startX: startX,
        startY: startY,
        endX: endX,
        endY: endY,
      },
    };

    // Update stoneImages array
    setStoneImages(stoneImages.map(s => 
      s.id === viewingStone.id ? updatedStone : s
    ));

    // Update viewingStone
    setViewingStone(updatedStone);

    // Reset modified flag
    setViewSelectionModified(false);
  };

  const handleBackToSlabSelection = () => {
    setSlabDialogState('select');
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
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside className={`bg-white rounded-lg shadow-lg transition-all duration-300 flex-shrink-0 ${sidebarOpen ? 'w-64 p-4' : 'w-0 overflow-hidden p-0'}`}>
        {sidebarOpen && (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Background</h2>
              <button
                onClick={() => setSidebarOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1"
                title="Close Sidebar"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="space-y-4">
              {/* Canvas Size Controls */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Canvas Size (meters)</h3>
                <div className="space-y-2">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Width (X)</label>
                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={canvasSizeX}
                      onChange={(e) => setCanvasSizeX(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">Height (Y)</label>
                    <input
                      type="number"
                      min="0.1"
                      max="100"
                      step="0.1"
                      value={canvasSizeY}
                      onChange={(e) => setCanvasSizeY(parseFloat(e.target.value) || 0.1)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
              
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={() => setShowSlabDialog(true)}
                  className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  Select Slab
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
                    <h3 className="text-sm font-semibold text-gray-700 mb-2">Stone Images ({stoneImages.length})</h3>
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
                                ? 'border-indigo-500 bg-indigo-50' 
                                : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                            }`}
                            onClick={() => {
                              setSelectedStoneId(stone.id);
                              setViewingStone(stone);
                              setShowStoneViewDialog(true);
                              setCropOverlayStyle(null);
                              setViewSelectionModified(false);
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
                                  Stone {stone.id.slice(-6)}
                                </div>
                                <div className="text-xs text-gray-600 space-y-0.5">
                                  <div>Left: {distanceLeft.toFixed(3)}m</div>
                                  <div>Top: {distanceTop.toFixed(3)}m</div>
                                  <div>Rotation: {Math.round(stone.rotation)}°</div>
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
                </>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 min-w-0">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl">
          {/* G-code Generation Button */}
          <div className="mb-4 flex justify-end">
            <button
              onClick={generateGCode}
              disabled={stoneImages.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
              title={stoneImages.length === 0 ? 'Add stone images to generate G-code' : 'Generate and download G-code for all stone images'}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Generate G-Code
            </button>
          </div>
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
              />
            </div>
      </main>

      {/* Slab Selection Dialog */}
      {showSlabDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {slabDialogState === 'select' ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">Select Stone Slab</h2>
                  <button
                    onClick={() => {
                      setShowSlabDialog(false);
                      setSlabDialogState('select');
                      setSelectedSlabImage(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-600 mb-4">Choose a stone slab to select a portion from:</p>
                <div className="grid grid-cols-3 gap-4">
                  {slabImages.map((slab) => (
                    <button
                      key={slab.id}
                      onClick={() => handleSlabImageClick(slab.url)}
                      className="relative aspect-video rounded-lg border-2 border-gray-300 hover:border-indigo-500 overflow-hidden transition-all group"
                    >
                      <img
                        src={slab.url}
                        alt={slab.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image doesn't exist, show placeholder
                          const target = e.target as HTMLImageElement;
                          target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect width="200" height="200" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="14"%3E' + slab.name + '%3C/text%3E%3C/svg%3E';
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
              <div className="flex gap-4">
                {/* Sidebar for shape and size selection */}
                <div className="w-64 flex-shrink-0 space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Shape Selection</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => {
                          setSelectedShape('rectangle');
                          if (shapePosition) {
                            updateCropSelectionFromShape(shapePosition.x, shapePosition.y);
                          }
                        }}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedShape === 'rectangle'
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="w-full h-12 border-2 border-gray-600 rounded"></div>
                        <span className="text-xs mt-1 block text-center">Rectangle</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedShape('circle');
                          if (shapePosition) {
                            updateCropSelectionFromShape(shapePosition.x, shapePosition.y);
                          }
                        }}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedShape === 'circle'
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="w-full h-12 border-2 border-gray-600 rounded-full"></div>
                        <span className="text-xs mt-1 block text-center">Circle</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedShape('triangle');
                          if (shapePosition) {
                            updateCropSelectionFromShape(shapePosition.x, shapePosition.y);
                          }
                        }}
                        className={`p-3 border-2 rounded-lg transition-all ${
                          selectedShape === 'triangle'
                            ? 'border-indigo-500 bg-indigo-50'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="w-full h-12 flex items-end justify-center">
                          <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-b-[24px] border-l-transparent border-r-transparent border-b-gray-600"></div>
                        </div>
                        <span className="text-xs mt-1 block text-center">Triangle</span>
                      </button>
                      <button
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
                      </button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 mb-3">Size (in meters)</h3>
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
                              updateCropSelectionFromShape(shapePosition.x, shapePosition.y);
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
                              updateCropSelectionFromShape(shapePosition.x, shapePosition.y);
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
                  <h2 className="text-2xl font-bold text-gray-800">Select Part of Stone</h2>
                  <button
                    onClick={() => {
                      setShowSlabDialog(false);
                      setSlabDialogState('select');
                      setSelectedSlabImage(null);
                      setCropSelection(null);
                        setShapePosition(null);
                    }}
                    className="text-gray-500 hover:text-gray-700 p-1"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                  <p className="text-gray-600 mb-4">Click on the image to position the selected shape, or drag the selection to move it:</p>
                <div
                  ref={slabContainerRef}
                  className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100"
                    onClick={(e) => {
                      // Don't handle click if we're dragging the selection
                      if (isDraggingSelection) return;
                      if (!slabImageRef.current || !slabContainerRef.current) return;
                      const containerRect = e.currentTarget.getBoundingClientRect();
                      const imgRect = slabImageRef.current.getBoundingClientRect();
                      const x = e.clientX - containerRect.left;
                      const y = e.clientY - containerRect.top;
                      
                      // Check if click is within image bounds
                      const imgLeft = imgRect.left - containerRect.left;
                      const imgTop = imgRect.top - containerRect.top;
                      const imgRight = imgLeft + imgRect.width;
                      const imgBottom = imgTop + imgRect.height;
                      
                      if (x >= imgLeft && x <= imgRight && y >= imgTop && y <= imgBottom) {
                        const imgX = x - imgLeft;
                        const imgY = y - imgTop;
                        setShapePosition({ x: imgX, y: imgY });
                        updateCropSelectionFromShape(imgX, imgY);
                      }
                    }}
                    onMouseMove={(e) => {
                      if (!slabImageRef.current || !slabContainerRef.current || !shapePosition || !cropSelection) return;
                      
                      const containerRect = e.currentTarget.getBoundingClientRect();
                      const imgRect = slabImageRef.current.getBoundingClientRect();
                      const x = e.clientX - containerRect.left;
                      const y = e.clientY - containerRect.top;
                      
                      // Calculate image bounds
                      const imgLeft = imgRect.left - containerRect.left;
                      const imgTop = imgRect.top - containerRect.top;
                      const imgDisplayWidth = imgRect.width;
                      const imgDisplayHeight = imgRect.height;
                      
                      if (isDraggingSelection && dragOffset && selectedSlabImage) {
                        // Find the selected slab image to get its size properties
                        const selectedSlab = slabImages.find(slab => slab.url === selectedSlabImage);
                        if (!selectedSlab) return;
                        
                        // Calculate new position relative to image
                        const newImgX = x - imgLeft - dragOffset.x;
                        const newImgY = y - imgTop - dragOffset.y;
                        
                        // Use the slab image's example size to calculate pixels-to-meters conversion
                        const pixelsToMetersX = selectedSlab.exampleWidthMeters / imgDisplayWidth;
                        const pixelsToMetersY = selectedSlab.exampleHeightMeters / imgDisplayHeight;
                        const widthInPixels = shapeWidth / pixelsToMetersX;
                        const heightInPixels = shapeHeight / pixelsToMetersY;
                        
                        let halfWidth: number, halfHeight: number;
                        if (selectedShape === 'circle') {
                          halfWidth = Math.max(widthInPixels, heightInPixels) / 2;
                          halfHeight = halfWidth;
                        } else {
                          halfWidth = widthInPixels / 2;
                          halfHeight = heightInPixels / 2;
                        }
                        
                        // Constrain to image bounds
                        const constrainedX = Math.max(halfWidth, Math.min(newImgX, imgDisplayWidth - halfWidth));
                        const constrainedY = Math.max(halfHeight, Math.min(newImgY, imgDisplayHeight - halfHeight));
                        
                        setShapePosition({ x: constrainedX, y: constrainedY });
                        // Update crop selection immediately during drag
                        updateCropSelectionFromShape(constrainedX, constrainedY, false);
                      } else if (isResizingSelection && resizeHandle && resizeStart) {
                        // Handle resizing
                        const imgX = x - imgLeft;
                        const imgY = y - imgTop;
                        
                        let newWidth = resizeStart.width;
                        let newHeight = resizeStart.height;
                        let newCenterX = resizeStart.centerX;
                        let newCenterY = resizeStart.centerY;
                        
                        // Calculate resize based on handle
                        if (resizeHandle.includes('e')) {
                          const diff = imgX - (resizeStart.centerX + resizeStart.width / 2);
                          newWidth = Math.max(20, resizeStart.width + diff * 2);
                        }
                        if (resizeHandle.includes('w')) {
                          const diff = (resizeStart.centerX - resizeStart.width / 2) - imgX;
                          newWidth = Math.max(20, resizeStart.width + diff * 2);
                          newCenterX = resizeStart.centerX - diff;
                        }
                        if (resizeHandle.includes('s')) {
                          const diff = imgY - (resizeStart.centerY + resizeStart.height / 2);
                          newHeight = Math.max(20, resizeStart.height + diff * 2);
                        }
                        if (resizeHandle.includes('n')) {
                          const diff = (resizeStart.centerY - resizeStart.height / 2) - imgY;
                          newHeight = Math.max(20, resizeStart.height + diff * 2);
                          newCenterY = resizeStart.centerY - diff;
                        }
                        
                        // Constrain to image bounds
                        const halfWidth = newWidth / 2;
                        const halfHeight = newHeight / 2;
                        newCenterX = Math.max(halfWidth, Math.min(newCenterX, imgDisplayWidth - halfWidth));
                        newCenterY = Math.max(halfHeight, Math.min(newCenterY, imgDisplayHeight - halfHeight));
                        
                        // Find the selected slab image to get its size properties
                        if (selectedSlabImage) {
                          const selectedSlab = slabImages.find(slab => slab.url === selectedSlabImage);
                          if (selectedSlab) {
                            // Use the slab image's example size to calculate pixels-to-meters conversion
                            const pixelsToMetersX = selectedSlab.exampleWidthMeters / imgDisplayWidth;
                            const pixelsToMetersY = selectedSlab.exampleHeightMeters / imgDisplayHeight;
                            
                            // Update width and height in meters
                            const newWidthMeters = newWidth * pixelsToMetersX;
                            const newHeightMeters = newHeight * pixelsToMetersY;
                            
                            setShapeWidth(newWidthMeters);
                            setShapeHeight(newHeightMeters);
                            setShapePosition({ x: newCenterX, y: newCenterY });
                            updateCropSelectionFromShape(newCenterX, newCenterY, false);
                          }
                        }
                      }
                    }}
                    onMouseUp={() => {
                      setIsDraggingSelection(false);
                      setIsResizingSelection(false);
                      setDragOffset(null);
                      setResizeHandle(null);
                      setResizeStart(null);
                      // Just update crop selection based on current position, don't recalculate position
                      if (shapePosition) {
                        updateCropSelectionFromShape(shapePosition.x, shapePosition.y, false);
                      }
                    }}
                    onMouseLeave={() => {
                      setIsDraggingSelection(false);
                      setIsResizingSelection(false);
                      setDragOffset(null);
                      setResizeHandle(null);
                      setResizeStart(null);
                      // Just update crop selection based on current position, don't recalculate position
                      if (shapePosition) {
                        updateCropSelectionFromShape(shapePosition.x, shapePosition.y, false);
                      }
                    }}
                  style={{ maxHeight: '60vh' }}
                >
                  <img
                    ref={slabImageRef}
                    src={selectedSlabImage || ''}
                    alt="Stone slab"
                    className="w-full h-auto max-h-[60vh] object-contain pointer-events-none select-none"
                    draggable={false}
                    onDragStart={(e) => e.preventDefault()}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3EImage not found%3C/text%3E%3C/svg%3E';
                    }}
                  />
                  {cropSelection && shapePosition && slabImageRef.current && slabContainerRef.current && (() => {
                    const containerRect = slabContainerRef.current!.getBoundingClientRect();
                    const imgRect = slabImageRef.current!.getBoundingClientRect();
                    const imgLeft = imgRect.left - containerRect.left;
                    const imgTop = imgRect.top - containerRect.top;
                    
                    const selectionWidth = Math.abs(cropSelection.endX - cropSelection.startX);
                    const selectionHeight = Math.abs(cropSelection.endY - cropSelection.startY);
                    const selectionLeft = imgLeft + Math.min(cropSelection.startX, cropSelection.endX);
                    const selectionTop = imgTop + Math.min(cropSelection.startY, cropSelection.endY);
                    const centerX = imgLeft + shapePosition.x;
                    const centerY = imgTop + shapePosition.y;
                    
                    return (
                      <>
                        {/* Shape overlay based on selected shape */}
                        {selectedShape === 'circle' && (
                      <div
                            className="absolute border-2 border-indigo-500 bg-indigo-500 bg-opacity-20 rounded-full cursor-move"
                        style={{
                              left: `${selectionLeft}px`,
                              top: `${selectionTop}px`,
                              width: `${selectionWidth}px`,
                              height: `${selectionWidth}px`,
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (!slabImageRef.current || !slabContainerRef.current) return;
                              const containerRect = slabContainerRef.current.getBoundingClientRect();
                              const imgRect = slabImageRef.current.getBoundingClientRect();
                              const imgLeft = imgRect.left - containerRect.left;
                              const imgTop = imgRect.top - containerRect.top;
                              
                              const mouseX = e.clientX - containerRect.left;
                              const mouseY = e.clientY - containerRect.top;
                              const imgX = mouseX - imgLeft;
                              const imgY = mouseY - imgTop;
                              
                              setDragOffset({ x: imgX - shapePosition.x, y: imgY - shapePosition.y });
                              setIsDraggingSelection(true);
                            }}
                          />
                        )}
                        {selectedShape === 'triangle' && (
                          <svg
                            className="absolute cursor-move"
                            style={{
                              left: `${selectionLeft}px`,
                              top: `${selectionTop}px`,
                              width: `${selectionWidth}px`,
                              height: `${selectionHeight}px`,
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (!slabImageRef.current || !slabContainerRef.current) return;
                              const containerRect = slabContainerRef.current.getBoundingClientRect();
                              const imgRect = slabImageRef.current.getBoundingClientRect();
                              const imgLeft = imgRect.left - containerRect.left;
                              const imgTop = imgRect.top - containerRect.top;
                              
                              const mouseX = e.clientX - containerRect.left;
                              const mouseY = e.clientY - containerRect.top;
                              const imgX = mouseX - imgLeft;
                              const imgY = mouseY - imgTop;
                              
                              setDragOffset({ x: imgX - shapePosition.x, y: imgY - shapePosition.y });
                              setIsDraggingSelection(true);
                            }}
                          >
                            <polygon
                              points={`${selectionWidth / 2},0 ${selectionWidth},${selectionHeight} 0,${selectionHeight}`}
                              fill="rgba(99, 102, 241, 0.2)"
                              stroke="rgb(99, 102, 241)"
                              strokeWidth="2"
                            />
                          </svg>
                        )}
                        {(selectedShape === 'rectangle' || selectedShape === 'cube') && (
                          <div
                            className="absolute border-2 border-indigo-500 bg-indigo-500 bg-opacity-20 cursor-move"
                            style={{
                              left: `${selectionLeft}px`,
                              top: `${selectionTop}px`,
                              width: `${selectionWidth}px`,
                              height: `${selectionHeight}px`,
                            }}
                            onMouseDown={(e) => {
                              e.stopPropagation();
                              if (!slabImageRef.current || !slabContainerRef.current) return;
                              const containerRect = slabContainerRef.current.getBoundingClientRect();
                              const imgRect = slabImageRef.current.getBoundingClientRect();
                              const imgLeft = imgRect.left - containerRect.left;
                              const imgTop = imgRect.top - containerRect.top;
                              
                              const mouseX = e.clientX - containerRect.left;
                              const mouseY = e.clientY - containerRect.top;
                              const imgX = mouseX - imgLeft;
                              const imgY = mouseY - imgTop;
                              
                              setDragOffset({ x: imgX - shapePosition.x, y: imgY - shapePosition.y });
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
                            transform: 'translateX(-50%)',
                          }}
                        >
                          {shapeWidth.toFixed(3)} m
                        </div>
                        {/* Height label on right edge (outside) */}
                        <div
                          className="absolute pointer-events-none text-sm font-bold text-indigo-600"
                          style={{
                            left: `${selectionLeft + selectionWidth + 10}px`,
                            top: `${centerY}px`,
                            transform: 'translateY(-50%) rotate(90deg)',
                            transformOrigin: 'center',
                          }}
                        >
                          {shapeHeight.toFixed(3)} m
                        </div>
                        {/* Resize handles */}
                        {['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].map((handle) => {
                          const handleStyle: React.CSSProperties = {
                            position: 'absolute',
                            width: '10px',
                            height: '10px',
                            backgroundColor: '#3B82F6',
                            border: '2px solid #1E40AF',
                            borderRadius: '2px',
                            cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' :
                                    handle === 'ne' || handle === 'sw' ? 'nesw-resize' :
                                    handle === 'n' || handle === 's' ? 'ns-resize' : 'ew-resize',
                            zIndex: 10,
                          };
                          
                          if (handle.includes('w')) handleStyle.left = `${selectionLeft - 5}px`;
                          if (handle.includes('e')) handleStyle.left = `${selectionLeft + selectionWidth - 5}px`;
                          if (handle.includes('n')) handleStyle.top = `${selectionTop - 5}px`;
                          if (handle.includes('s')) handleStyle.top = `${selectionTop + selectionHeight - 5}px`;
                          if (!handle.includes('w') && !handle.includes('e')) handleStyle.left = `${selectionLeft + selectionWidth / 2 - 5}px`;
                          if (!handle.includes('n') && !handle.includes('s')) handleStyle.top = `${selectionTop + selectionHeight / 2 - 5}px`;
                          
                          return (
                            <div
                              key={handle}
                              style={handleStyle}
                              onMouseDown={(e) => {
                                e.stopPropagation();
                                if (!shapePosition || !cropSelection) return;
                                
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
                        })}
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
                  <button
                    onClick={handleAddCropToCanvas}
                    disabled={!cropSelection}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                  >
                    Confirm
                  </button>
                </div>
              </div>
          </div>)}
        </div>
      </div>
      )}

      {/* Stone View Dialog */}
      {showStoneViewDialog && viewingStone && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-800">Selected Stone Area</h2>
              <button
                onClick={() => {
                  setShowStoneViewDialog(false);
                  setViewingStone(null);
                  setViewSelectionModified(false);
                }}
                className="text-gray-500 hover:text-gray-700 p-1"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 mb-4">The selected area is highlighted on the original image. You can drag it to move:</p>
            <div
              ref={viewStoneContainerRef}
              className="relative border-2 border-gray-300 rounded-lg overflow-hidden bg-gray-100"
              style={{ height: '60vh' }}
              onMouseMove={(e) => {
                if (!viewStoneImageRef.current || !viewStoneContainerRef.current || !viewingStone || !cropOverlayStyle) return;
                
                const containerRect = e.currentTarget.getBoundingClientRect();
                const imgRect = viewStoneImageRef.current.getBoundingClientRect();
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
                  const constrainedLeft = Math.max(imgLeft, Math.min(newLeft, imgLeft + imgDisplayWidth - currentWidth));
                  const constrainedTop = Math.max(imgTop, Math.min(newTop, imgTop + imgDisplayHeight - currentHeight));
                  
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
                  if (viewStoneImageRef.current && viewStoneContainerRef.current && viewingStone && cropOverlayStyle) {
                    const img = viewStoneImageRef.current;
                    const containerRect = viewStoneContainerRef.current.getBoundingClientRect();
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
                    const overlayLeft = parseFloat(cropOverlayStyle.left) - imgLeft;
                    const overlayTop = parseFloat(cropOverlayStyle.top) - imgTop;
                    
                    // Preserve the original crop size (don't change it)
                    const originalCropWidth = viewingStone.cropSelection.endX - viewingStone.cropSelection.startX;
                    const originalCropHeight = viewingStone.cropSelection.endY - viewingStone.cropSelection.startY;
                    
                    // Calculate new crop position in natural image coordinates
                    const newStartX = overlayLeft * scaleX;
                    const newStartY = overlayTop * scaleY;
                    const newEndX = newStartX + originalCropWidth;
                    const newEndY = newStartY + originalCropHeight;

                    const cropWidth = originalCropWidth;
                    const cropHeight = originalCropHeight;

                    // Create a canvas to crop the image
                    const canvas = document.createElement('canvas');
                    canvas.width = cropWidth;
                    canvas.height = cropHeight;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      // Draw the cropped portion
                      ctx.drawImage(
                        img,
                        newStartX, newStartY, cropWidth, cropHeight,
                        0, 0, cropWidth, cropHeight
                      );

                      // Convert to data URL
                      const croppedDataURL = canvas.toDataURL('image/png');

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
                      setStoneImages(stoneImages.map(s => 
                        s.id === viewingStone.id ? updatedStone : s
                      ));
                    }
                  }
                }
                setIsDraggingViewOverlay(false);
                setViewDragOffset(null);
                setViewSelectionModified(false);
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
                className="w-full h-[60vh] object-cover pointer-events-none select-none"
                draggable={false}
                onDragStart={(e) => e.preventDefault()}
                onLoad={() => {
                  if (viewStoneImageRef.current && viewStoneContainerRef.current && viewingStone) {
                    const containerRect = viewStoneContainerRef.current.getBoundingClientRect();
                    const imgRect = viewStoneImageRef.current.getBoundingClientRect();
                    const imgLeft = imgRect.left - containerRect.left;
                    const imgTop = imgRect.top - containerRect.top;
                    const imgDisplayWidth = imgRect.width;
                    const imgDisplayHeight = imgRect.height;
                    const imgNaturalWidth = viewStoneImageRef.current.naturalWidth;
                    const imgNaturalHeight = viewStoneImageRef.current.naturalHeight;
                    
                    // Calculate the scale factor from natural to display
                    const scaleX = imgDisplayWidth / imgNaturalWidth;
                    const scaleY = imgDisplayHeight / imgNaturalHeight;
                    
                    // Convert cropSelection from natural image coordinates to current display coordinates
                    const displayStartX = viewingStone.cropSelection.startX * scaleX;
                    const displayStartY = viewingStone.cropSelection.startY * scaleY;
                    const displayEndX = viewingStone.cropSelection.endX * scaleX;
                    const displayEndY = viewingStone.cropSelection.endY * scaleY;
                    
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
                  target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%23e5e7eb"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%239ca3af" font-size="16"%3EImage not found%3C/text%3E%3C/svg%3E';
                }}
              />
              {cropOverlayStyle && (
                <>
                  <div
                    className="absolute border-2 border-indigo-500 bg-indigo-500 bg-opacity-20 cursor-move"
                    style={cropOverlayStyle}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      if (!viewStoneImageRef.current || !viewStoneContainerRef.current || !cropOverlayStyle) return;
                      const containerRect = viewStoneContainerRef.current.getBoundingClientRect();
                      const mouseX = e.clientX - containerRect.left;
                      const mouseY = e.clientY - containerRect.top;
                      const overlayLeft = parseFloat(cropOverlayStyle.left);
                      const overlayTop = parseFloat(cropOverlayStyle.top);
                      
                      setViewDragOffset({ x: mouseX - overlayLeft, y: mouseY - overlayTop });
                      setIsDraggingViewOverlay(true);
                      setViewSelectionModified(true);
                    }}
                  />
              </>
            )}
            </div>
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Stone Information</h3>
              <div className="text-sm text-gray-600 space-y-1">
                {(() => {
                  // Calculate actual canvas dimensions
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
                  
                  // Find the slab image to get its size properties for size display
                  const selectedSlab = slabImages.find(slab => slab.url === viewingStone.originalImageUrl);
                  const sizeInMeters = selectedSlab ? {
                    width: viewingStone.width * pixelsToMetersX,
                    height: viewingStone.height * pixelsToMetersY,
                  } : null;
                  
                  return (
                    <>
                      <div>Position: Left {distanceLeft.toFixed(3)}m, Top {distanceTop.toFixed(3)}m</div>
                      <div>Rotation: {Math.round(viewingStone.rotation)}°</div>
                      {sizeInMeters ? (
                        <div>Size: {sizeInMeters.width.toFixed(3)}m × {sizeInMeters.height.toFixed(3)}m</div>
                      ) : (
                        <div>Size: {viewingStone.width.toFixed(0)} × {viewingStone.height.toFixed(0)}px</div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
            {viewSelectionModified && (
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleConfirmViewSelectionChange}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
                >
                  Confirm Changes
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

