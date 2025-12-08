'use client';

import { useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { vectorizePNGToSVG } from '@/utils/vectorize';
import { extractPointsFromSVG } from '@/utils/svgParser';
import { extractPointsFromLines } from '@/utils/lineExtractor';
import { generateGCode } from '@/utils/gcodeGenerator';
import { generateSVGFromPoints } from '@/utils/svgGenerator';
import { Point } from '@/utils/svgParser';

// Dynamically import DrawingCanvas with SSR disabled
const DrawingCanvas = dynamic(() => import('@/components/DrawingCanvas'), {
  ssr: false,
});

type Tool = 'pen' | 'line' | 'eraser' | 'bucket';

export default function Home() {
  const [lines, setLines] = useState<any[]>([]);
  const [brushSize, setBrushSize] = useState(5);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [tool, setTool] = useState<Tool>('pen');
  const [fillColor, setFillColor] = useState('#000000');
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [canvasSize, setCanvasSize] = useState(1); // Size in meters, default 1m
  const [showSVGPreview, setShowSVGPreview] = useState(false);
  const [svgPreview, setSvgPreview] = useState<string | null>(null);
  const [pendingPoints, setPendingPoints] = useState<Point[] | null>(null);
  const [selectedStoneImage, setSelectedStoneImage] = useState<string | null>(null);
  const [svgPreviewBackground, setSvgPreviewBackground] = useState<string | null>(null);
  const [svgPosition, setSvgPosition] = useState({ x: 0, y: 0 });
  const [isDraggingSvg, setIsDraggingSvg] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const stageRef = useRef<any>(null);

  // Default stone images from public folder
  const stoneImages = [
    { id: 'stone1', name: 'Stone Pattern 1', url: '/images/stone1.svg' },
    { id: 'stone2', name: 'Stone Pattern 2', url: '/images/stone2.svg' },
    { id: 'stone3', name: 'Stone Pattern 3', url: '/images/stone3.svg' },
    { id: 'stone4', name: 'Stone Pattern 4', url: '/images/stone4.svg' },
    { id: 'stone5', name: 'Stone Pattern 5', url: '/images/stone5.svg' },
    { id: 'stone6', name: 'Stone Pattern 6', url: '/images/stone6.svg' },
  ];

  const clearCanvas = () => {
    setLines([]);
  };

  const handleBackgroundImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result;
        if (typeof result === 'string') {
          setBackgroundImage(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBackgroundImage = () => {
    setBackgroundImage(null);
  };

  const exportCanvasToPNG = (): Promise<string> => {
    return new Promise((resolve) => {
      const stage = stageRef.current;
      if (!stage) {
        resolve('');
        return;
      }
      
      const dataURL = stage.toDataURL({
        mimeType: 'image/png',
        quality: 1,
        pixelRatio: 1,
      });
      resolve(dataURL);
    });
  };

  const downloadGCode = (gcode: string) => {
    const blob = new Blob([gcode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'drawing.gcode';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleGenerateGCode = async () => {
    // Check if there are any fill operations
    const hasFills = lines.some(line => line.type === 'fill');
    if (!hasFills) {
      alert('Please use the Bucket tool to fill areas first. G-Code will only be generated for filled areas.');
      return;
    }
    
    if (lines.length === 0) {
      alert('Please draw something first!');
      return;
    }

    setIsGenerating(true);
    try {
      console.log('Step 1: Extracting points from fill operations...');
      // Extract points from fill operations (bucket tool)
      let points = await extractPointsFromLines(lines);
      console.log('Step 1: Extracted', points.length, 'points from fill boundaries');
      
      // If no points from fills, show message
      if (points.length === 0) {
        const hasFills = lines.some(line => line.type === 'fill');
        if (!hasFills) {
          alert('No fill operations found. Please use the Bucket tool to fill areas first.');
          setIsGenerating(false);
          return;
        }
        alert('Failed to extract boundary from fill areas. Please try filling again.');
        setIsGenerating(false);
        return;
      }
      
      // Generate SVG preview
      const canvasWidth = 800;
      const canvasHeight = 600;
      const svg = generateSVGFromPoints(points, canvasWidth, canvasHeight);
      setSvgPreview(svg);
      setPendingPoints(points);
      setShowSVGPreview(true);
      setIsGenerating(false);
    } catch (error: any) {
      console.error('Error preparing SVG preview:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Error preparing SVG preview: ${errorMessage}\n\nCheck the console for more details.`);
      setIsGenerating(false);
    }
  };

  const handleConfirmGCode = async () => {
    if (!pendingPoints) return;
    
    setIsGenerating(true);
    setShowSVGPreview(false);
    
    try {
      console.log('Step 4: Generating G-Code...');
      // Generate G-Code with size scaling
      // Canvas is 800x600 pixels, size is in meters (convert to mm)
      const canvasWidth = 800;
      const canvasHeight = 600;
      const sizeInMm = canvasSize * 1000; // Convert meters to millimeters
      // Scale based on canvas width to maintain aspect ratio
      const scale = sizeInMm / canvasWidth;
      const gcode = generateGCode(pendingPoints, 1500, scale, true, canvasWidth, canvasHeight);
      console.log('Step 4: Success, G-Code length:', gcode.length);
      console.log(`Step 4: Canvas size: ${canvasSize}m (${sizeInMm}mm), Scale: ${scale.toFixed(4)}mm per pixel`);
      
      // Download G-Code
      downloadGCode(gcode);
      console.log('Step 5: Download complete');
      
      // Clear pending points
      setPendingPoints(null);
      setSvgPreview(null);
    } catch (error: any) {
      console.error('Error generating G-Code:', error);
      const errorMessage = error?.message || 'Unknown error occurred';
      alert(`Error generating G-Code: ${errorMessage}\n\nCheck the console for more details.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCancelGCode = () => {
    setShowSVGPreview(false);
    setPendingPoints(null);
    setSvgPreview(null);
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
              {!showSVGPreview && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Canvas Size
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0.1"
                        max="10"
                        step="0.1"
                        value={canvasSize}
                        onChange={(e) => setCanvasSize(Number(e.target.value))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-sm text-gray-600">m</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Canvas area: {canvasSize}m × {(canvasSize * 600 / 800).toFixed(2)}m
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Choose Local Pattern
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleBackgroundImageUpload}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                    />
                    {backgroundImage && (
                      <div className="mt-3">
                        <div className="relative">
                          <img
                            src={backgroundImage}
                            alt="Background preview"
                            className="w-full h-32 object-cover rounded-lg border border-gray-300"
                          />
                          <button
                            onClick={removeBackgroundImage}
                            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                            title="Remove background"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">Local pattern loaded</p>
                      </div>
                    )}
                  </div>
                </>
              )}
              
              {showSVGPreview && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Background Image
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {stoneImages.map((stone) => (
                      <button
                        key={stone.id}
                        onClick={() => {
                          setSelectedStoneImage(stone.url);
                          setSvgPreviewBackground(stone.url);
                          setSvgPosition({ x: 0, y: 0 }); // Reset position when selecting new image
                        }}
                        className={`relative aspect-video rounded-lg border-2 overflow-hidden transition-all ${
                          selectedStoneImage === stone.url
                            ? 'border-blue-500 ring-2 ring-blue-200'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <img
                          src={stone.url}
                          alt={stone.name}
                          className="w-full h-full object-cover"
                        />
                        {selectedStoneImage === stone.url && (
                          <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                  {selectedStoneImage && (
                    <button
                      onClick={() => {
                        setSelectedStoneImage(null);
                        setSvgPreviewBackground(null);
                      }}
                      className="mt-2 w-full px-3 py-2 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center p-4 min-w-0">
        {showSVGPreview && svgPreview ? (
          /* SVG Preview Step */
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl">
            <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
              SVG Preview
            </h1>
            
            <div className="flex flex-col items-center gap-6">
              <div 
                className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white w-full max-w-4xl relative"
                onMouseMove={(e) => {
                  if (isDraggingSvg) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setSvgPosition({
                      x: e.clientX - rect.left - dragStart.x,
                      y: e.clientY - rect.top - dragStart.y
                    });
                  }
                }}
                onMouseUp={() => {
                  setIsDraggingSvg(false);
                }}
                onMouseLeave={() => {
                  setIsDraggingSvg(false);
                }}
              >
                {svgPreviewBackground ? (
                  <div 
                    className="absolute inset-0"
                    style={{
                      backgroundImage: `url(${svgPreviewBackground})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      opacity: 0.3,
                      zIndex: 1
                    }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-white" />
                )}
                <div 
                  className="p-6 flex items-center justify-center min-h-[400px] relative z-10"
                  style={{
                    cursor: isDraggingSvg ? 'grabbing' : 'grab'
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setIsDraggingSvg(true);
                    const rect = e.currentTarget.getBoundingClientRect();
                    setDragStart({
                      x: e.clientX - rect.left - svgPosition.x,
                      y: e.clientY - rect.top - svgPosition.y
                    });
                  }}
                >
                  <div 
                    dangerouslySetInnerHTML={{ __html: svgPreview }}
                    className="max-w-full"
                    style={{
                      transform: `translate(${svgPosition.x}px, ${svgPosition.y}px)`,
                      transition: isDraggingSvg ? 'none' : 'transform 0.1s ease-out'
                    }}
                  />
                </div>
              </div>
              
              <div className="flex gap-4 justify-center w-full">
                <button
                  onClick={handleCancelGCode}
                  className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors font-medium"
                >
                  ← Go to Step Before
                </button>
                <button
                  onClick={handleConfirmGCode}
                  disabled={isGenerating}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isGenerating ? 'Generating...' : 'Confirm & Generate G-Code'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Drawing Canvas Step */
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl">
            <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
              Sketch to G-Code Converter
            </h1>
            
            <div className="flex flex-col items-center gap-4">
              {/* Controls */}
              <div className="flex flex-wrap items-center gap-4 justify-center w-full">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Tool:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTool('pen')}
                      className={`px-4 py-2 rounded transition-colors ${
                        tool === 'pen'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Pen
                    </button>
                    <button
                      onClick={() => setTool('line')}
                      className={`px-4 py-2 rounded transition-colors ${
                        tool === 'line'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Line
                    </button>
                    <button
                      onClick={() => setTool('eraser')}
                      className={`px-4 py-2 rounded transition-colors ${
                        tool === 'eraser'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Eraser
                    </button>
                    <button
                      onClick={() => setTool('bucket')}
                      className={`px-4 py-2 rounded transition-colors ${
                        tool === 'bucket'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Bucket
                    </button>
                  </div>
                </div>
                
                {tool === 'bucket' && (
                  <div className="flex items-center gap-2">
                    <label htmlFor="fillColor" className="text-sm font-medium text-gray-700">
                      Fill Color:
                    </label>
                    <input
                      id="fillColor"
                      type="color"
                      value={fillColor}
                      onChange={(e) => setFillColor(e.target.value)}
                      className="w-12 h-8 rounded border border-gray-300 cursor-pointer"
                    />
                    <span className="text-sm text-gray-600">{fillColor}</span>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <label htmlFor="brushSize" className="text-sm font-medium text-gray-700">
                    Brush Size:
                  </label>
                  <input
                    id="brushSize"
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                    className="w-24"
                  />
                  <span className="text-sm text-gray-600 w-8">{brushSize}px</span>
                </div>
                
                <button
                  onClick={clearCanvas}
                  className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  Clear Canvas
                </button>
                
                <button
                  onClick={handleGenerateGCode}
                  disabled={isGenerating || lines.length === 0}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isGenerating ? 'Generating...' : 'Generate G-Code (Fills Only)'}
                </button>
              </div>

              {/* Canvas */}
              <div className="relative">
                <DrawingCanvas
                  lines={lines}
                  setLines={setLines}
                  brushSize={brushSize}
                  isDrawing={isDrawing}
                  setIsDrawing={setIsDrawing}
                  tool={tool}
                  fillColor={fillColor}
                  backgroundImage={backgroundImage}
                  stageRef={stageRef}
                  canvasSize={canvasSize}
                />
                <p className="text-sm text-gray-500 text-center mt-2">
                  Use the Bucket tool to fill areas, then click "Generate G-Code" to create G-Code for filled regions only
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

