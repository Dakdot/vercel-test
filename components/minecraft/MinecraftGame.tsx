"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

// Block types
const BLOCK_TYPES = {
  GRASS: "grass",
  DIRT: "dirt",
  STONE: "stone",
  WOOD: "wood",
  LEAVES: "leaves",
} as const;

type BlockType = (typeof BLOCK_TYPES)[keyof typeof BLOCK_TYPES];

const MinecraftGame = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const worldRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const [selectedBlock, setSelectedBlock] = useState<BlockType>(
    BLOCK_TYPES.GRASS,
  );
  const [isMouseLocked, setIsMouseLocked] = useState(false);

  // Camera movement variables
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false,
    up: false,
    down: false,
  });

  const direction = useRef(new THREE.Vector3());

  // Create block materials
  const createMaterials = () => {
    const materials: Record<BlockType, THREE.Material> = {
      [BLOCK_TYPES.GRASS]: new THREE.MeshLambertMaterial({ color: 0x4a9c4a }),
      [BLOCK_TYPES.DIRT]: new THREE.MeshLambertMaterial({ color: 0x8b4513 }),
      [BLOCK_TYPES.STONE]: new THREE.MeshLambertMaterial({ color: 0x666666 }),
      [BLOCK_TYPES.WOOD]: new THREE.MeshLambertMaterial({ color: 0x8b4513 }),
      [BLOCK_TYPES.LEAVES]: new THREE.MeshLambertMaterial({ color: 0x228b22 }),
    };
    return materials;
  };

  // Generate initial world
  const generateWorld = (
    scene: THREE.Scene,
    materials: Record<BlockType, THREE.Material>,
  ) => {
    const world = new Map<string, THREE.Mesh>();
    const size = 20;

    for (let x = -size; x <= size; x++) {
      for (let z = -size; z <= size; z++) {
        // Generate terrain height using simple noise
        const height =
          Math.floor(Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3) + 5;

        for (let y = 0; y <= height; y++) {
          let blockType: BlockType;

          if (y === height) {
            blockType = BLOCK_TYPES.GRASS;
          } else if (y >= height - 3) {
            blockType = BLOCK_TYPES.DIRT;
          } else {
            blockType = BLOCK_TYPES.STONE;
          }

          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const mesh = new THREE.Mesh(geometry, materials[blockType]);
          mesh.position.set(x, y, z);

          scene.add(mesh);
          world.set(`${x},${y},${z}`, mesh);
        }

        // Add some trees randomly
        if (Math.random() < 0.05 && height > 3) {
          const treeHeight = 4 + Math.floor(Math.random() * 3);

          // Tree trunk
          for (let y = height + 1; y <= height + treeHeight; y++) {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const mesh = new THREE.Mesh(geometry, materials[BLOCK_TYPES.WOOD]);
            mesh.position.set(x, y, z);
            scene.add(mesh);
            world.set(`${x},${y},${z}`, mesh);
          }

          // Tree leaves
          const leafY = height + treeHeight;
          for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
              for (let dy = 0; dy <= 2; dy++) {
                if (Math.abs(dx) + Math.abs(dz) <= 2 && Math.random() < 0.8) {
                  const geometry = new THREE.BoxGeometry(1, 1, 1);
                  const mesh = new THREE.Mesh(
                    geometry,
                    materials[BLOCK_TYPES.LEAVES],
                  );
                  mesh.position.set(x + dx, leafY + dy, z + dz);
                  scene.add(mesh);
                  world.set(`${x + dx},${leafY + dy},${z + dz}`, mesh);
                }
              }
            }
          }
        }
      }
    }

    return world;
  };

  // Handle pointer lock
  const requestPointerLock = () => {
    if (mountRef.current) {
      mountRef.current.requestPointerLock();
    }
  };

  const handlePointerLockChange = () => {
    setIsMouseLocked(document.pointerLockElement === mountRef.current);
  };

  // Raycast for block selection
  const getTargetBlock = (
    camera: THREE.Camera,
    world: Map<string, THREE.Mesh>,
  ) => {
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
  };

  useEffect(() => {
    if (!mountRef.current) return;

    const currentMount = mountRef.current;

    // Initialize Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb); // Sky blue
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000,
    );
    camera.position.set(0, 10, 10);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(50, 50, 25);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Create materials and world
    const materials = createMaterials();
    const world = generateWorld(scene, materials);
    worldRef.current = world;

    currentMount.appendChild(renderer.domElement);

    // Controls
    let mouseX = 0;
    let mouseY = 0;
    const euler = new THREE.Euler(0, 0, 0, "YXZ");

    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseLocked) return;

      const movementX = event.movementX || 0;
      const movementY = event.movementY || 0;

      mouseX -= movementX * 0.002;
      mouseY -= movementY * 0.002;

      mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, mouseY));

      euler.setFromQuaternion(camera.quaternion);
      euler.y = mouseX;
      euler.x = mouseY;
      camera.quaternion.setFromEuler(euler);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
          moveState.current.forward = true;
          break;
        case "KeyS":
          moveState.current.backward = true;
          break;
        case "KeyA":
          moveState.current.left = true;
          break;
        case "KeyD":
          moveState.current.right = true;
          break;
        case "Space":
          event.preventDefault();
          moveState.current.up = true;
          break;
        case "ShiftLeft":
          moveState.current.down = true;
          break;
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      switch (event.code) {
        case "KeyW":
          moveState.current.forward = false;
          break;
        case "KeyS":
          moveState.current.backward = false;
          break;
        case "KeyA":
          moveState.current.left = false;
          break;
        case "KeyD":
          moveState.current.right = false;
          break;
        case "Space":
          moveState.current.up = false;
          break;
        case "ShiftLeft":
          moveState.current.down = false;
          break;
      }
    };

    const handleClick = (event: MouseEvent) => {
      if (!isMouseLocked) return;

      const target = getTargetBlock(camera, world);
      if (!target) return;

      if (event.button === 0) {
        // Left click - remove block
        const key = `${target.remove.x},${target.remove.y},${target.remove.z}`;
        const mesh = world.get(key);
        if (mesh) {
          scene.remove(mesh);
          world.delete(key);
        }
      } else if (event.button === 2) {
        // Right click - place block
        const key = `${target.place.x},${target.place.y},${target.place.z}`;
        if (!world.has(key)) {
          const geometry = new THREE.BoxGeometry(1, 1, 1);
          const mesh = new THREE.Mesh(geometry, materials[selectedBlock]);
          mesh.position.set(target.place.x, target.place.y, target.place.z);
          scene.add(mesh);
          world.set(key, mesh);
        }
      }
    };

    // Movement loop
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();

      if (isMouseLocked) {
        // Update movement
        direction.current.set(0, 0, 0);

        if (moveState.current.forward) direction.current.z -= 1;
        if (moveState.current.backward) direction.current.z += 1;
        if (moveState.current.left) direction.current.x -= 1;
        if (moveState.current.right) direction.current.x += 1;
        if (moveState.current.up) direction.current.y += 1;
        if (moveState.current.down) direction.current.y -= 1;

        direction.current.normalize();
        direction.current.multiplyScalar(10 * delta);

        // Apply rotation to movement direction
        const quaternion = camera.quaternion.clone();
        quaternion.x = 0; // Don't apply pitch to horizontal movement
        quaternion.normalize();

        const horizontalDirection = new THREE.Vector3(
          direction.current.x,
          0,
          direction.current.z,
        );
        horizontalDirection.applyQuaternion(quaternion);

        camera.position.add(horizontalDirection);
        camera.position.y += direction.current.y;
      }

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };

    // Event listeners
    document.addEventListener("pointerlockchange", handlePointerLockChange);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    animate();

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      document.removeEventListener(
        "pointerlockchange",
        handlePointerLockChange,
      );
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("resize", handleResize);

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [isMouseLocked, selectedBlock]);

  return (
    <div className="relative w-full h-full">
      <div
        ref={mountRef}
        className="w-full h-full cursor-pointer"
        onClick={requestPointerLock}
        style={{ outline: "none" }}
        tabIndex={0}
      />

      {/* UI Overlay */}
      <div className="absolute top-4 left-4 bg-black/50 text-white p-4 rounded">
        <h3 className="text-lg font-bold mb-2">Minecraft Clone</h3>
        {!isMouseLocked ? (
          <p className="text-sm">Click to start playing</p>
        ) : (
          <div>
            <p className="text-sm mb-2">Controls:</p>
            <ul className="text-xs space-y-1">
              <li>WASD - Move</li>
              <li>Space - Up</li>
              <li>Shift - Down</li>
              <li>Left Click - Remove block</li>
              <li>Right Click - Place block</li>
              <li>ESC - Exit</li>
            </ul>
          </div>
        )}
      </div>

      {/* Block selector */}
      {isMouseLocked && (
        <div className="absolute top-4 right-4 bg-black/50 text-white p-4 rounded">
          <h4 className="text-sm font-bold mb-2">Select Block:</h4>
          <div className="flex flex-col gap-2">
            {Object.values(BLOCK_TYPES).map((blockType) => (
              <button
                key={blockType}
                className={`px-3 py-1 rounded text-xs ${
                  selectedBlock === blockType
                    ? "bg-white text-black"
                    : "bg-gray-600 hover:bg-gray-500"
                }`}
                onClick={() => setSelectedBlock(blockType)}
              >
                {blockType.charAt(0).toUpperCase() + blockType.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Crosshair */}
      {isMouseLocked && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-4 h-4">
            <div className="absolute top-1/2 left-1/2 w-2 h-0.5 bg-white transform -translate-x-1/2 -translate-y-1/2"></div>
            <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-white transform -translate-x-1/2 -translate-y-1/2"></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MinecraftGame;
