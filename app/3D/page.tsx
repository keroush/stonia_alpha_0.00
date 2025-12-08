'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createHouse } from '@/components/House';
import { 
  createWall, 
  createTwoWalls, 
  createNorthWall, 
  createRightWall, 
  createNorthRightWalls, 
  createSouthWall, 
  createRightSouthWalls 
} from '@/components/Wall';

export default function ThreeDPage() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [rows, setRows] = useState(2);
  const [columns, setColumns] = useState(2);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{ x: number; z: number } | null>(null);
  const [inputNumber, setInputNumber] = useState('');
  const sceneRef = useRef<THREE.Scene | null>(null);
  const housesRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    if (!mountRef.current) return;

    // Clear previous renderer if exists
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene; // Set scene reference
    scene.background = new THREE.Color(0x87ceeb); // Sky blue background

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75,
      800 / 600,
      0.1,
      1000
    );
    camera.position.set(30, 30, 30);
    camera.lookAt(0, 0, 0);

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(800, 600);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // House dimensions (10x10 pixels = 10x10 units in Three.js)
    const houseSpacing = 15; // Space between house centers (yards will connect)

    // Function to create ground piece with button
    const createGroundWithButton = (x: number, z: number) => {
      const yardSize = houseSpacing; // Yard size matches spacing so yards connect at borders
      const groundHeight = 2; // Height of the ground
      const groundGeometry = new THREE.BoxGeometry(yardSize, groundHeight, yardSize);
      const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x90ee90 }); // Light green ground
      const ground = new THREE.Mesh(groundGeometry, groundMaterial);
      ground.position.set(x, -groundHeight / 2, z); // Position so top is at y=0
      ground.castShadow = true;
      ground.receiveShadow = true;
      ground.userData = { position: { x, z } }; // Store position for click detection
      scene.add(ground);

      // Create button (3D box) in the middle of ground
      const buttonGeometry = new THREE.BoxGeometry(2, 1, 2);
      const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x4169e1 }); // Blue button
      const button = new THREE.Mesh(buttonGeometry, buttonMaterial);
      button.position.set(x, 1, z);
      button.userData = { position: { x, z }, isButton: true };
      button.castShadow = true;
      scene.add(button);
    };

    // Calculate positions for houses with spacing, but yards stick together
    // Houses have spacing between them, yards connect at borders
    const totalWidth = (columns - 1) * houseSpacing;
    const totalDepth = (rows - 1) * houseSpacing;
    const startX = -totalWidth / 2;
    const startZ = -totalDepth / 2;

    // Create ground pieces with buttons in grid pattern
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        const x = startX + col * houseSpacing;
        const z = startZ + row * houseSpacing;
        createGroundWithButton(x, z);
      }
    }

    // Add click handler for buttons
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onMouseClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(scene.children, true);

      for (const intersect of intersects) {
        if (intersect.object.userData.isButton) {
          const pos = intersect.object.userData.position;
          setSelectedPosition(pos);
          setShowDialog(true);
          break;
        }
      }
    };

    renderer.domElement.addEventListener('click', onMouseClick);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true; // Enable smooth camera movement
    controls.dampingFactor = 0.05;
    controls.minDistance = 10;
    controls.maxDistance = 100;
    controls.target.set(0, 5, 0); // Look at the center of the grid

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update(); // Update controls in animation loop
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Store renderer reference for cleanup
    const rendererRef = renderer;
    const cameraRef = camera;

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      rendererRef.domElement.removeEventListener('click', onMouseClick);
      if (mountRef.current && rendererRef.domElement) {
        mountRef.current.removeChild(rendererRef.domElement);
      }
      rendererRef.dispose();
      housesRef.current = [];
      sceneRef.current = null;
    };
  }, [rows, columns]);


  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar Toggle Button (when closed) */}
      {!sidebarOpen && (
        <button
          onClick={() => setSidebarOpen(true)}
          className="fixed left-4 top-4 z-20 bg-white rounded-lg shadow-lg p-3 text-gray-600 hover:text-gray-800 hover:bg-gray-50 transition-colors"
          title="Open Settings"
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
              <h2 className="text-lg font-semibold text-gray-800">Settings</h2>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={rows}
                  onChange={(e) => setRows(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Columns
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={columns}
                  onChange={(e) => setColumns(Math.max(1, Math.min(10, Number(e.target.value))))}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
                />
              </div>
              <div className="pt-2 border-t border-gray-200">
                <p className="text-xs text-gray-500">
                  Total Houses: {rows * columns}
                </p>
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 min-w-0">
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-6xl w-full">
          <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
            3D Houses ({rows}x{columns})
          </h1>
          <div ref={mountRef} className="flex justify-center items-center rounded-lg overflow-hidden bg-gray-200" />
        </div>
      </main>

      {/* Choice Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Choose Option</h2>
            <p className="text-gray-600 mb-4">What would you like to generate on this ground piece?</p>
            
            {/* Number Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or enter number directly:
              </label>
              <input
                type="text"
                value={inputNumber}
                onChange={(e) => setInputNumber(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-lg"
                placeholder="Enter number (1, 0100, 0010, 0110, 0001, 0011, 1000, 1100)..."
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const input = inputNumber.trim();
                    const number = parseInt(input);
                    
                    if (selectedPosition && sceneRef.current) {
                      let handled = false;
                      
                      // Check string codes first (to handle leading zeros)
                      if (input === '0100') {
                        createNorthWall(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                        handled = true;
                      } else if (input === '0010') {
                        createRightWall(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                        handled = true;
                      } else if (input === '0110') {
                        createNorthRightWalls(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                        handled = true;
                      } else if (input === '0001') {
                        createSouthWall(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                        handled = true;
                      } else if (input === '0011') {
                        createRightSouthWalls(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                        handled = true;
                      } else if (number === 1) {
                        createHouse(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                        handled = true;
                      } else if (number === 1000) {
                        createWall(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                        handled = true;
                      } else if (number === 1100) {
                        createTwoWalls(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                        handled = true;
                      }
                      
                      if (handled) {
                        setShowDialog(false);
                        setInputNumber('');
                        setSelectedPosition(null);
                      }
                    }
                  } else if (e.key === 'Escape') {
                    setShowDialog(false);
                    setInputNumber('');
                    setSelectedPosition(null);
                  }
                }}
              />
            </div>

            {/* Choice Buttons */}
            <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
              <button
                onClick={() => {
                  if (selectedPosition && sceneRef.current) {
                    createHouse(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                  }
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-left"
              >
                <span className="font-semibold">1 - Generate House</span>
              </button>
              <button
                onClick={() => {
                  if (selectedPosition && sceneRef.current) {
                    createNorthWall(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                  }
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-left"
              >
                <span className="font-semibold">0100 - Generate Wall (North)</span>
              </button>
              <button
                onClick={() => {
                  if (selectedPosition && sceneRef.current) {
                    createRightWall(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                  }
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="w-full px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition-colors text-left"
              >
                <span className="font-semibold">0010 - Generate Wall (Right)</span>
              </button>
              <button
                onClick={() => {
                  if (selectedPosition && sceneRef.current) {
                    createNorthRightWalls(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                  }
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-left"
              >
                <span className="font-semibold">0110 - Generate Two Walls (North & Right)</span>
              </button>
              <button
                onClick={() => {
                  if (selectedPosition && sceneRef.current) {
                    createSouthWall(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                  }
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-left"
              >
                <span className="font-semibold">0001 - Generate Wall (South)</span>
              </button>
              <button
                onClick={() => {
                  if (selectedPosition && sceneRef.current) {
                    createRightSouthWalls(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                  }
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="w-full px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors text-left"
              >
                <span className="font-semibold">0011 - Generate Two Walls (Right & South)</span>
              </button>
              <button
                onClick={() => {
                  if (selectedPosition && sceneRef.current) {
                    createWall(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                  }
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-left"
              >
                <span className="font-semibold">1000 - Generate Wall (Left Side)</span>
              </button>
              <button
                onClick={() => {
                  if (selectedPosition && sceneRef.current) {
                    createTwoWalls(sceneRef.current, selectedPosition.x, selectedPosition.z, housesRef);
                  }
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-left"
              >
                <span className="font-semibold">1100 - Generate Two Walls (Left & North)</span>
              </button>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowDialog(false);
                  setInputNumber('');
                  setSelectedPosition(null);
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
