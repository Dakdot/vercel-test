// Utility functions for Minecraft clone

import * as THREE from 'three';

export interface Position {
  x: number;
  y: number;
  z: number;
}

export interface BlockData {
  position: Position;
  type: string;
}

// Block types enum
export const BLOCK_TYPES = {
  GRASS: 'grass',
  DIRT: 'dirt',
  STONE: 'stone',
  WOOD: 'wood',
  LEAVES: 'leaves',
} as const;

export type BlockType = typeof BLOCK_TYPES[keyof typeof BLOCK_TYPES];

// Block colors for materials
export const BLOCK_COLORS: Record<BlockType, number> = {
  [BLOCK_TYPES.GRASS]: 0x4a9c4a,
  [BLOCK_TYPES.DIRT]: 0x8b4513,
  [BLOCK_TYPES.STONE]: 0x666666,
  [BLOCK_TYPES.WOOD]: 0x8b4513,
  [BLOCK_TYPES.LEAVES]: 0x228b22,
};

/**
 * Generate a unique key for a block position
 */
export function getBlockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/**
 * Parse block key back to position
 */
export function parseBlockKey(key: string): Position {
  const [x, y, z] = key.split(',').map(Number);
  return { x, y, z };
}

/**
 * Simple noise function for terrain generation
 */
export function noise(x: number, z: number): number {
  return Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3;
}

/**
 * Generate terrain height at given coordinates
 */
export function getTerrainHeight(x: number, z: number): number {
  return Math.floor(noise(x, z)) + 5;
}

/**
 * Determine block type based on height and terrain height
 */
export function getBlockType(y: number, terrainHeight: number): BlockType {
  if (y === terrainHeight) {
    return BLOCK_TYPES.GRASS;
  } else if (y >= terrainHeight - 3) {
    return BLOCK_TYPES.DIRT;
  } else {
    return BLOCK_TYPES.STONE;
  }
}

/**
 * Check if a position should have a tree
 */
export function shouldGenerateTree(x: number, z: number, terrainHeight: number): boolean {
  // Use position-based pseudo-random to ensure consistency
  const seed = x * 1000 + z;
  const random = Math.abs(Math.sin(seed)) * 10000;
  return (random % 1) < 0.05 && terrainHeight > 3;
}

/**
 * Get tree positions for a given base position
 */
export function getTreeBlocks(x: number, z: number, terrainHeight: number): BlockData[] {
  const blocks: BlockData[] = [];
  const treeHeight = 4 + Math.floor(Math.random() * 3);

  // Tree trunk
  for (let y = terrainHeight + 1; y <= terrainHeight + treeHeight; y++) {
    blocks.push({
      position: { x, y, z },
      type: BLOCK_TYPES.WOOD,
    });
  }

  // Tree leaves
  const leafY = terrainHeight + treeHeight;
  for (let dx = -2; dx <= 2; dx++) {
    for (let dz = -2; dz <= 2; dz++) {
      for (let dy = 0; dy <= 2; dy++) {
        if (Math.abs(dx) + Math.abs(dz) <= 2 && Math.random() < 0.8) {
          blocks.push({
            position: { x: x + dx, y: leafY + dy, z: z + dz },
            type: BLOCK_TYPES.LEAVES,
          });
        }
      }
    }
  }

  return blocks;
}

/**
 * Create block materials
 */
export function createBlockMaterials(): Record<BlockType, THREE.Material> {
  const materials: Record<BlockType, THREE.Material> = {} as Record<BlockType, THREE.Material>;

  Object.entries(BLOCK_COLORS).forEach(([type, color]) => {
    materials[type as BlockType] = new THREE.MeshLambertMaterial({ color });
  });

  return materials;
}

/**
 * Perform raycast to find target block
 */
export function raycastBlock(
  camera: THREE.Camera,
  world: Map<string, THREE.Mesh>
): { place: Position; remove: Position } | null {
  const raycaster = new THREE.Raycaster();
  const direction = new THREE.Vector3(0, 0, -1);
  direction.applyQuaternion(camera.quaternion);

  raycaster.set(camera.position, direction);

  const meshes = Array.from(world.values());
  const intersects = raycaster.intersectObjects(meshes);

  if (intersects.length > 0) {
    const intersect = intersects[0];
    const point = intersect.point.clone();
    const normal = intersect.face?.normal.clone();

    if (normal) {
      normal.transformDirection(intersect.object.matrixWorld);

      // For placing blocks
      const placePosition = point.add(normal.multiplyScalar(0.5));
      const placeX = Math.round(placePosition.x);
      const placeY = Math.round(placePosition.y);
      const placeZ = Math.round(placePosition.z);

      // For removing blocks
      const removePosition = point.sub(normal);
      const removeX = Math.round(removePosition.x);
      const removeY = Math.round(removePosition.y);
      const removeZ = Math.round(removePosition.z);

      return {
        place: { x: placeX, y: placeY, z: placeZ },
        remove: { x: removeX, y: removeY, z: removeZ },
      };
    }
  }

  return null;
}

/**
 * Convert world coordinates to chunk coordinates
 */
export function worldToChunk(x: number, z: number, chunkSize: number = 16): Position {
  return {
    x: Math.floor(x / chunkSize),
    y: 0,
    z: Math.floor(z / chunkSize),
  };
}

/**
 * Check if two positions are adjacent (within 1 block distance)
 */
export function arePositionsAdjacent(pos1: Position, pos2: Position): boolean {
  const dx = Math.abs(pos1.x - pos2.x);
  const dy = Math.abs(pos1.y - pos2.y);
  const dz = Math.abs(pos1.z - pos2.z);

  return dx <= 1 && dy <= 1 && dz <= 1 && (dx + dy + dz) > 0;
}

/**
 * Calculate distance between two positions
 */
export function distanceBetweenPositions(pos1: Position, pos2: Position): number {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  const dz = pos1.z - pos2.z;

  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Linear interpolation between two values
 */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
