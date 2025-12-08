'use client';

import * as THREE from 'three';

export function createWall(scene: THREE.Scene, x: number, z: number, housesRef: React.MutableRefObject<THREE.Mesh[]>) {
  const houseSpacing = 15; // Size of ground piece
  const wallHeight = 8; // Height of the wall
  const wallThickness = 0.5; // Thickness of the wall

  // Check if wall already exists at this position
  const existingWall = housesRef.current.find(h => 
    Math.abs(h.position.x - (x - houseSpacing / 2)) < 0.1 && 
    Math.abs(h.position.z - z) < 0.1 &&
    h.userData?.isWall
  );
  if (existingWall) return; // Wall already exists

  // Wall positioned at left border, full height, full length
  const wallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, houseSpacing);
  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 }); // Brown wall
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  // Position at left border: x - (houseSpacing / 2) + (wallThickness / 2)
  wall.position.set(x - houseSpacing / 2 + wallThickness / 2, wallHeight / 2, z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  wall.userData = { isWall: true };
  scene.add(wall);
  housesRef.current.push(wall);
}

export function createTwoWalls(scene: THREE.Scene, x: number, z: number, housesRef: React.MutableRefObject<THREE.Mesh[]>) {
  const houseSpacing = 15; // Size of ground piece
  const wallHeight = 8; // Height of the wall
  const wallThickness = 0.5; // Thickness of the wall

  // Create left wall
  const leftWallExists = housesRef.current.find(h => 
    Math.abs(h.position.x - (x - houseSpacing / 2)) < 0.1 && 
    Math.abs(h.position.z - z) < 0.1 &&
    h.userData?.isWall &&
    h.userData?.wallSide === 'left'
  );
  if (!leftWallExists) {
    const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, houseSpacing);
    const leftWallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 }); // Brown wall
    const leftWall = new THREE.Mesh(leftWallGeometry, leftWallMaterial);
    leftWall.position.set(x - houseSpacing / 2 + wallThickness / 2, wallHeight / 2, z);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    leftWall.userData = { isWall: true, wallSide: 'left' };
    scene.add(leftWall);
    housesRef.current.push(leftWall);
  }

  // Create north wall (perpendicular to left wall, at north border)
  const northWallExists = housesRef.current.find(h => 
    Math.abs(h.position.x - x) < 0.1 && 
    Math.abs(h.position.z - (z - houseSpacing / 2)) < 0.1 &&
    h.userData?.isWall &&
    h.userData?.wallSide === 'north'
  );
  if (!northWallExists) {
    const northWallGeometry = new THREE.BoxGeometry(houseSpacing, wallHeight, wallThickness);
    const northWallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 }); // Brown wall
    const northWall = new THREE.Mesh(northWallGeometry, northWallMaterial);
    // Position at north border: z - (houseSpacing / 2) + (wallThickness / 2)
    northWall.position.set(x, wallHeight / 2, z - houseSpacing / 2 + wallThickness / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    northWall.userData = { isWall: true, wallSide: 'north' };
    scene.add(northWall);
    housesRef.current.push(northWall);
  }
}

// Helper function to create a single wall on a specific side
function createWallOnSide(
  scene: THREE.Scene,
  x: number,
  z: number,
  side: 'north' | 'south' | 'east' | 'west',
  housesRef: React.MutableRefObject<THREE.Mesh[]>
) {
  const houseSpacing = 15; // Size of ground piece
  const wallHeight = 8; // Height of the wall
  const wallThickness = 0.5; // Thickness of the wall

  // Check if wall already exists
  let checkPosition: { x: number; z: number };
  if (side === 'north') {
    checkPosition = { x, z: z - houseSpacing / 2 };
  } else if (side === 'south') {
    checkPosition = { x, z: z + houseSpacing / 2 };
  } else if (side === 'east' || side === 'right') {
    checkPosition = { x: x + houseSpacing / 2, z };
  } else { // west or left
    checkPosition = { x: x - houseSpacing / 2, z };
  }

  const existingWall = housesRef.current.find(h => 
    Math.abs(h.position.x - checkPosition.x) < 0.1 && 
    Math.abs(h.position.z - checkPosition.z) < 0.1 &&
    h.userData?.isWall &&
    h.userData?.wallSide === side
  );
  if (existingWall) return; // Wall already exists

  let wallGeometry: THREE.BoxGeometry;
  let wallPosition: { x: number; y: number; z: number };

  if (side === 'north') {
    wallGeometry = new THREE.BoxGeometry(houseSpacing, wallHeight, wallThickness);
    wallPosition = { x, y: wallHeight / 2, z: z - houseSpacing / 2 + wallThickness / 2 };
  } else if (side === 'south') {
    wallGeometry = new THREE.BoxGeometry(houseSpacing, wallHeight, wallThickness);
    wallPosition = { x, y: wallHeight / 2, z: z + houseSpacing / 2 - wallThickness / 2 };
  } else if (side === 'east' || side === 'right') {
    wallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, houseSpacing);
    wallPosition = { x: x + houseSpacing / 2 - wallThickness / 2, y: wallHeight / 2, z };
  } else { // west or left
    wallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, houseSpacing);
    wallPosition = { x: x - houseSpacing / 2 + wallThickness / 2, y: wallHeight / 2, z };
  }

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7355 }); // Brown wall
  const wall = new THREE.Mesh(wallGeometry, wallMaterial);
  wall.position.set(wallPosition.x, wallPosition.y, wallPosition.z);
  wall.castShadow = true;
  wall.receiveShadow = true;
  wall.userData = { isWall: true, wallSide: side };
  scene.add(wall);
  housesRef.current.push(wall);
}

// 0100: 1 wall in north
export function createNorthWall(scene: THREE.Scene, x: number, z: number, housesRef: React.MutableRefObject<THREE.Mesh[]>) {
  createWallOnSide(scene, x, z, 'north', housesRef);
}

// 0010: 1 wall on right
export function createRightWall(scene: THREE.Scene, x: number, z: number, housesRef: React.MutableRefObject<THREE.Mesh[]>) {
  createWallOnSide(scene, x, z, 'right', housesRef);
}

// 0110: 2 walls (north and right)
export function createNorthRightWalls(scene: THREE.Scene, x: number, z: number, housesRef: React.MutableRefObject<THREE.Mesh[]>) {
  createWallOnSide(scene, x, z, 'north', housesRef);
  createWallOnSide(scene, x, z, 'right', housesRef);
}

// 0001: 1 wall in south
export function createSouthWall(scene: THREE.Scene, x: number, z: number, housesRef: React.MutableRefObject<THREE.Mesh[]>) {
  createWallOnSide(scene, x, z, 'south', housesRef);
}

// 0011: 2 walls (right and south)
export function createRightSouthWalls(scene: THREE.Scene, x: number, z: number, housesRef: React.MutableRefObject<THREE.Mesh[]>) {
  createWallOnSide(scene, x, z, 'right', housesRef);
  createWallOnSide(scene, x, z, 'south', housesRef);
}

