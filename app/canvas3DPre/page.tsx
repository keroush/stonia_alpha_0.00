"use client";

import { useEffect, useRef, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

function Canvas3DPreContent() {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const searchParams = useSearchParams();
  const [stoneCount, setStoneCount] = useState<number>(0);

  useEffect(() => {
    if (!mountRef.current) return;

    // Get canvas dimensions from URL params
    const width = parseFloat(searchParams.get("width") || "2");
    const height = parseFloat(searchParams.get("height") || "2");
    const tableHeight = 0.2; // Table height in meters

    // Get stone images data from localStorage
    let stoneImages: any[] = [];
    let canvasWidth = 800;
    let canvasHeight = 600;
    try {
      const storedData = localStorage.getItem("stonia3DData");
      if (storedData) {
        const data = JSON.parse(storedData);
        stoneImages = data.stoneImages || [];
        canvasWidth = data.canvasWidth || 800;
        canvasHeight = data.canvasHeight || 600;
        // Update stone count for display
        setStoneCount(stoneImages.length);
      }
    } catch (e) {
      console.error("Failed to load stone images data:", e);
    }

    // Calculate pixels-to-meters conversion
    const pixelsToMetersX = width / canvasWidth;
    const pixelsToMetersY = height / canvasHeight;

    // Clear previous renderer if exists
    while (mountRef.current.firstChild) {
      mountRef.current.removeChild(mountRef.current.firstChild);
    }

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0xf0f0f0); // Light gray background

    // Camera setup - top-down view to match canvas
    // Table extends from (0, 0, 0) to (width, 0, height)
    const camera = new THREE.OrthographicCamera(
      0, // left (start of table)
      width, // right (end of table)
      height, // top (start of table in Z)
      0, // bottom (end of table in Z)
      0.1,
      1000
    );
    // Position camera directly above looking down
    camera.position.set(width / 2, 10, height / 2);
    camera.lookAt(width / 2, tableHeight, height / 2);
    camera.zoom = 0.4;
    camera.updateProjectionMatrix();
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.target.set(width / 2, tableHeight / 2, height / 2);
    controls.update();
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(width, height * 2, width);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -width * 2;
    directionalLight.shadow.camera.right = width * 2;
    directionalLight.shadow.camera.top = height * 2;
    directionalLight.shadow.camera.bottom = -height * 2;
    scene.add(directionalLight);

    // Create table (like shape)
    const tableGroup = new THREE.Group();

    // Table top (flat surface)
    const tableTopGeometry = new THREE.BoxGeometry(
      width,
      tableHeight * 0.1,
      height
    );
    const tableTopMaterial = new THREE.MeshStandardMaterial({
      color: 0x8b4513, // Brown color for wood
      roughness: 0.7,
      metalness: 0.1,
    });
    const tableTop = new THREE.Mesh(tableTopGeometry, tableTopMaterial);
    tableTop.position.set(width / 2, tableHeight, height / 2);
    tableTop.castShadow = true;
    tableTop.receiveShadow = true;
    tableGroup.add(tableTop);

    // Table legs (4 legs at corners)
    const legRadius = 0.05;
    const legHeight = tableHeight;
    const legGeometry = new THREE.CylinderGeometry(
      legRadius,
      legRadius,
      legHeight,
      16
    );
    const legMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321, // Darker brown for legs
      roughness: 0.8,
      metalness: 0.1,
    });

    const legPositions = [
      [legRadius * 2, legHeight / 2, legRadius * 2],
      [width - legRadius * 2, legHeight / 2, legRadius * 2],
      [legRadius * 2, legHeight / 2, height - legRadius * 2],
      [width - legRadius * 2, legHeight / 2, height - legRadius * 2],
    ];

    legPositions.forEach(([x, y, z]) => {
      const leg = new THREE.Mesh(legGeometry, legMaterial);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      leg.receiveShadow = true;
      tableGroup.add(leg);
    });

    scene.add(tableGroup);

    // Add stone images as textures on the table
    const stoneGroup = new THREE.Group();
    const textureLoader = new THREE.TextureLoader();

    // Table top surface is at tableHeight + (tableHeight * 0.1) / 2
    const tableTopSurfaceY = tableHeight + (tableHeight * 0.1) / 2;

    stoneImages.forEach((stone, index) => {
      // Calculate distance to left and distance to top in meters (same as canvas)
      // stone.x and stone.y are the center positions in pixels
      const distanceLeft = stone.x * pixelsToMetersX; // Distance from left edge in meters
      const distanceTop = stone.y * pixelsToMetersY; // Distance from top edge in meters

      // Calculate size in meters
      const widthMeters = stone.width * pixelsToMetersX;
      const heightMeters = stone.height * pixelsToMetersY;

      // Create texture from image data (async, but we'll handle it)
      const texture = textureLoader.load(
        stone.imageData,
        // onLoad callback
        (loadedTexture) => {
          loadedTexture.wrapS = THREE.ClampToEdgeWrapping;
          loadedTexture.wrapT = THREE.ClampToEdgeWrapping;
          loadedTexture.needsUpdate = true;
        },
        // onProgress (optional)
        undefined,
        // onError
        (error) => {
          console.error("Error loading texture for stone:", stone.id, error);
        }
      );

      // Create plane geometry for the stone
      const planeGeometry = new THREE.PlaneGeometry(widthMeters, heightMeters);
      const planeMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        side: THREE.DoubleSide,
        roughness: 0.7,
        metalness: 0.1,
      });

      const plane = new THREE.Mesh(planeGeometry, planeMaterial);

      // Apply rotation:
      // 1. Lay the plane flat on XZ plane (rotate -90° around X)
      // 2. Apply the 2D canvas rotation around the local Z axis (which is now pointing up)
      // Canvas rotation: positive is clockwise when viewed from above
      // After X rotation, local Z points up, so Z rotation = world Y rotation
      const rotationDegrees = stone.rotation || 0;
      const rotationRadians = (rotationDegrees * Math.PI) / 180;

      // Set rotation: X to lay flat, Z for the 2D rotation (in local space after X rotation)
      plane.rotation.set(-Math.PI / 2, 0, -rotationRadians);

      // Position the plane on the table surface using distanceLeft and distanceTop
      // Table extends from (0, 0, 0) to (width, 0, height)
      // distanceLeft = meters from left edge (maps to X)
      // distanceTop = meters from top edge (maps to Z when viewed from top)
      plane.position.set(
        distanceLeft, // X position = distance from left in meters
        tableTopSurfaceY + 0.002, // Slightly above table surface
        distanceTop // Z position = distance from top in meters
      );

      plane.castShadow = false;
      plane.receiveShadow = true;
      stoneGroup.add(plane);

      console.log(`Stone ${index + 1} positioned at:`, {
        distanceLeft: distanceLeft.toFixed(3),
        distanceTop: distanceTop.toFixed(3),
        width: widthMeters.toFixed(3),
        height: heightMeters.toFixed(3),
        rotation: rotationDegrees,
        position: {
          x: distanceLeft,
          y: tableTopSurfaceY + 0.002,
          z: distanceTop,
        },
      });
    });

    scene.add(stoneGroup);

    // Log stone count for debugging
    console.log(`Added ${stoneImages.length} stone images to 3D scene`);

    // Grid helper for reference
    const gridHelper = new THREE.GridHelper(
      Math.max(width, height) * 2,
      20,
      0x888888,
      0xcccccc
    );
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // Axes helper
    const axesHelper = new THREE.AxesHelper(Math.max(width, height) * 1.5);
    scene.add(axesHelper);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Handle window resize
    const handleResize = () => {
      if (!camera || !renderer) return;
      const aspect = window.innerWidth / window.innerHeight;

      // Update orthographic camera bounds to maintain aspect ratio
      if (camera instanceof THREE.OrthographicCamera) {
        const viewHeight = height;
        const viewWidth = width;
        const aspectRatio = viewWidth / viewHeight;

        if (aspect > aspectRatio) {
          // Window is wider than canvas
          const newWidth = viewHeight * aspect;
          camera.left = (viewWidth - newWidth) / 2;
          camera.right = (viewWidth + newWidth) / 2;
          camera.top = viewHeight;
          camera.bottom = 0;
        } else {
          // Window is taller than canvas
          const newHeight = viewWidth / aspect;
          camera.left = 0;
          camera.right = viewWidth;
          camera.top = viewHeight + (newHeight - viewHeight) / 2;
          camera.bottom = -(newHeight - viewHeight) / 2;
        }
        camera.updateProjectionMatrix();
      }
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
    };
  }, [searchParams]);

  return (
    <div className="w-full h-screen bg-gray-100">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-4 left-4 bg-white bg-opacity-90 p-4 rounded-lg shadow-lg">
        <h1 className="text-xl font-bold mb-2">3D Canvas Preview</h1>
        <p className="text-sm text-gray-600">
          Table Size: {searchParams.get("width") || "2"}m ×{" "}
          {searchParams.get("height") || "2"}m
        </p>
        <p className="text-sm text-gray-600">Table Height: 0.2m</p>
        <p className="text-sm text-gray-600">Stone Images: {stoneCount}</p>
      </div>
    </div>
  );
}

export default function Canvas3DPrePage() {
  return (
    <Suspense
      fallback={
        <div className="w-full h-screen bg-gray-100 flex items-center justify-center">
          Loading...
        </div>
      }
    >
      <Canvas3DPreContent />
    </Suspense>
  );
}
