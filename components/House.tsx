'use client';

import * as THREE from 'three';

export function createHouse(scene: THREE.Scene, x: number, z: number, housesRef: React.MutableRefObject<THREE.Mesh[]>) {
  const houseSize = 10;
  const wallHeight = 8;
  const roofHeight = 4;

  // Check if house already exists at this position
  const existingHouse = housesRef.current.find(h => 
    Math.abs(h.position.x - x) < 0.1 && Math.abs(h.position.z - z) < 0.1
  );
  if (existingHouse) return; // House already exists

  // House base (walls)
  const wallGeometry = new THREE.BoxGeometry(houseSize, wallHeight, houseSize);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xd4a574 }); // Beige walls
  const walls = new THREE.Mesh(wallGeometry, wallMaterial);
  walls.position.set(x, wallHeight / 2, z);
  walls.castShadow = true;
  walls.receiveShadow = true;
  scene.add(walls);
  housesRef.current.push(walls);

  // Roof (triangular)
  const roofGeometry = new THREE.ConeGeometry(
    houseSize * Math.sqrt(2) / 1.2,
    roofHeight,
    4
  );
  const roofMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 }); // Brown roof
  const roof = new THREE.Mesh(roofGeometry, roofMaterial);
  roof.position.set(x, wallHeight + roofHeight / 2, z);
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;
  scene.add(roof);
  housesRef.current.push(roof);

  // Door
  const doorGeometry = new THREE.BoxGeometry(2, 4, 0.2);
  const doorMaterial = new THREE.MeshStandardMaterial({ color: 0x654321 }); // Dark brown door
  const door = new THREE.Mesh(doorGeometry, doorMaterial);
  door.position.set(x, 2, z + houseSize / 2 + 0.1);
  scene.add(door);
  housesRef.current.push(door);

  // Windows
  const windowGeometry = new THREE.BoxGeometry(1.5, 1.5, 0.1);
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x87ceeb }); // Blue windows
  const window1 = new THREE.Mesh(windowGeometry, windowMaterial);
  window1.position.set(x - 3, 4, z + houseSize / 2 + 0.1);
  scene.add(window1);
  housesRef.current.push(window1);

  const window2 = new THREE.Mesh(windowGeometry, windowMaterial);
  window2.position.set(x + 3, 4, z + houseSize / 2 + 0.1);
  scene.add(window2);
  housesRef.current.push(window2);
}

