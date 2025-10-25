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

// Cow mob class
class Cow {
  public mesh: THREE.Group;
  public position: THREE.Vector3;
  public direction: THREE.Vector3;
  public speed: number;
  public wanderTimer: number;
  public maxWanderTime: number;
  public id: string;
  public isFed: boolean;
  public followTarget: THREE.Vector3 | null;
  public fedTimer: number;
  public maxFedTime: number;

  constructor(x: number, y: number, z: number) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.position = new THREE.Vector3(x, y, z);
    this.direction = new THREE.Vector3(
      (Math.random() - 0.5) * 2,
      0,
      (Math.random() - 0.5) * 2,
    ).normalize();
    this.speed = 0.5 + Math.random() * 0.5; // Random speed between 0.5 and 1.0
    this.wanderTimer = 0;
    this.maxWanderTime = 3 + Math.random() * 4; // Change direction every 3-7 seconds
    this.isFed = false;
    this.followTarget = null;
    this.fedTimer = 0;
    this.maxFedTime = 10; // Follow for 10 seconds after being fed

    this.mesh = this.createCowMesh();
    this.mesh.position.copy(this.position);
  }

  private createCowMesh(): THREE.Group {
    const cowGroup = new THREE.Group();

    // Materials
    const whiteMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });
    const blackMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
    const pinkMaterial = new THREE.MeshLambertMaterial({ color: 0xffb6c1 });
    const happyMaterial = new THREE.MeshLambertMaterial({ color: 0xffff99 }); // Slightly yellow when happy

    // Body (main part)
    const bodyGeometry = new THREE.BoxGeometry(1.2, 0.8, 2);
    const bodyMesh = new THREE.Mesh(bodyGeometry, whiteMaterial);
    bodyMesh.position.set(0, 0.4, 0);
    bodyMesh.userData = { part: "body" }; // For material switching
    cowGroup.add(bodyMesh);

    // Head
    const headGeometry = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const headMesh = new THREE.Mesh(headGeometry, whiteMaterial);
    headMesh.position.set(0, 0.8, 1.2);
    cowGroup.add(headMesh);

    // Legs
    const legGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.2);
    const positions = [
      [-0.4, -0.4, 0.6], // Front left
      [0.4, -0.4, 0.6], // Front right
      [-0.4, -0.4, -0.6], // Back left
      [0.4, -0.4, -0.6], // Back right
    ];

    positions.forEach(([x, y, z]) => {
      const legMesh = new THREE.Mesh(legGeometry, whiteMaterial);
      legMesh.position.set(x, y, z);
      cowGroup.add(legMesh);
    });

    // Spots (black patches)
    const spotGeometry = new THREE.BoxGeometry(0.3, 0.1, 0.3);
    const spotPositions = [
      [-0.3, 0.85, 0.2],
      [0.2, 0.85, -0.3],
      [0.1, 0.85, 0.4],
    ];

    spotPositions.forEach(([x, y, z]) => {
      const spotMesh = new THREE.Mesh(spotGeometry, blackMaterial);
      spotMesh.position.set(x, y, z);
      cowGroup.add(spotMesh);
    });

    // Udder
    const udderGeometry = new THREE.SphereGeometry(0.2, 8, 6);
    const udderMesh = new THREE.Mesh(udderGeometry, pinkMaterial);
    udderMesh.position.set(0, 0.1, -0.3);
    cowGroup.add(udderMesh);

    // Tail
    const tailGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.6);
    const tailMesh = new THREE.Mesh(tailGeometry, blackMaterial);
    tailMesh.position.set(0, 0.3, -1.1);
    tailMesh.rotation.x = Math.PI / 4;
    cowGroup.add(tailMesh);

    // Ears
    const earGeometry = new THREE.BoxGeometry(0.2, 0.3, 0.1);
    const leftEar = new THREE.Mesh(earGeometry, whiteMaterial);
    leftEar.position.set(-0.3, 1.0, 1.2);
    leftEar.rotation.z = Math.PI / 6;
    cowGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeometry, whiteMaterial);
    rightEar.position.set(0.3, 1.0, 1.2);
    rightEar.rotation.z = -Math.PI / 6;
    cowGroup.add(rightEar);

    return cowGroup;
  }

  public update(delta: number, worldBounds: { min: number; max: number }) {
    this.wanderTimer += delta;

    // Update fed timer
    if (this.isFed) {
      this.fedTimer += delta;
      if (this.fedTimer >= this.maxFedTime) {
        this.isFed = false;
        this.followTarget = null;
        this.fedTimer = 0;
        this.updateBodyColor(false);
      }
    }

    // Behavior based on fed state
    if (this.isFed && this.followTarget) {
      // Follow the target (player)
      const directionToTarget = this.followTarget.clone().sub(this.position);
      const distanceToTarget = directionToTarget.length();

      if (distanceToTarget > 2) {
        // Don't get too close
        this.direction = directionToTarget.normalize();
        this.speed = 1.5; // Move faster when following
      } else {
        // Stop when close enough
        this.direction.set(0, 0, 0);
      }
    } else {
      // Normal wandering behavior
      this.speed = 0.5 + Math.random() * 0.5;

      // Change direction periodically or if hitting world bounds
      if (
        this.wanderTimer >= this.maxWanderTime ||
        this.isNearWorldBounds(worldBounds)
      ) {
        this.wanderTimer = 0;
        this.maxWanderTime = 3 + Math.random() * 4;

        // Random new direction
        this.direction
          .set((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2)
          .normalize();
      }
    }

    // Move the cow
    const movement = this.direction.clone().multiplyScalar(this.speed * delta);
    this.position.add(movement);

    // Keep cow within world bounds
    this.position.x = Math.max(
      worldBounds.min + 2,
      Math.min(worldBounds.max - 2, this.position.x),
    );
    this.position.z = Math.max(
      worldBounds.min + 2,
      Math.min(worldBounds.max - 2, this.position.z),
    );

    // Update mesh position
    this.mesh.position.copy(this.position);

    // Rotate cow to face movement direction
    if (this.direction.length() > 0) {
      const angle = Math.atan2(this.direction.x, this.direction.z);
      this.mesh.rotation.y = angle;
    }

    // Simple bob animation
    const time = Date.now() * 0.001;
    this.mesh.position.y = this.position.y + Math.sin(time * 2) * 0.05;
  }

  private isNearWorldBounds(worldBounds: {
    min: number;
    max: number;
  }): boolean {
    const buffer = 3;
    return (
      this.position.x <= worldBounds.min + buffer ||
      this.position.x >= worldBounds.max - buffer ||
      this.position.z <= worldBounds.min + buffer ||
      this.position.z >= worldBounds.max - buffer
    );
  }

  public feed(playerPosition: THREE.Vector3) {
    this.isFed = true;
    this.followTarget = playerPosition.clone();
    this.fedTimer = 0;
    this.updateBodyColor(true);
  }

  private updateBodyColor(isFed: boolean) {
    const happyMaterial = new THREE.MeshLambertMaterial({ color: 0xffff99 });
    const normalMaterial = new THREE.MeshLambertMaterial({ color: 0xffffff });

    this.mesh.children.forEach((child) => {
      if (child.userData.part === "body") {
        (child as THREE.Mesh).material = isFed ? happyMaterial : normalMaterial;
      }
    });
  }

  public getDistanceToPoint(point: THREE.Vector3): number {
    return this.position.distanceTo(point);
  }
}

const MinecraftGame = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const worldRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const cowsRef = useRef<Map<string, Cow>>(new Map());
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
    // Load grass texture
    const textureLoader = new THREE.TextureLoader();
    const grassTexture = textureLoader.load("/grass.png");
    grassTexture.magFilter = THREE.NearestFilter;
    grassTexture.minFilter = THREE.NearestFilter;
    grassTexture.wrapS = THREE.RepeatWrapping;
    grassTexture.wrapT = THREE.RepeatWrapping;

    const materials: Record<BlockType, THREE.Material> = {
      [BLOCK_TYPES.GRASS]: new THREE.MeshLambertMaterial({ map: grassTexture }),
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

  // Spawn cows in the world
  const spawnCows = (scene: THREE.Scene, count: number = 5) => {
    const cows = new Map<string, Cow>();
    const size = 15; // Spawn within a smaller area

    for (let i = 0; i < count; i++) {
      let x, z, y;
      let attempts = 0;

      // Find a suitable spawn position
      do {
        x = Math.random() * size * 2 - size;
        z = Math.random() * size * 2 - size;
        y = Math.floor(Math.sin(x * 0.1) * Math.cos(z * 0.1) * 3) + 6; // Surface height + 1
        attempts++;
      } while (attempts < 50); // Prevent infinite loop

      const cow = new Cow(x, y, z);
      scene.add(cow.mesh);
      cows.set(cow.id, cow);
    }

    return cows;
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

    // Spawn cows
    const cows = spawnCows(scene, 5);
    cowsRef.current = cows;

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

      // Check if clicking on a cow first
      const raycaster = new THREE.Raycaster();
      const direction = new THREE.Vector3(0, 0, -1);
      direction.applyQuaternion(camera.quaternion);
      raycaster.set(camera.position, direction);

      // Get all cow meshes
      const cowMeshes = Array.from(cows.values()).map((cow) => cow.mesh);
      const cowIntersects = raycaster.intersectObjects(cowMeshes, true);

      if (cowIntersects.length > 0 && event.button === 2) {
        // Right click on cow - feed it
        const clickedCowMesh =
          cowIntersects[0].object.parent || cowIntersects[0].object;
        const clickedCow = Array.from(cows.values()).find(
          (cow) =>
            cow.mesh === clickedCowMesh ||
            cow.mesh.children.includes(clickedCowMesh as any),
        );

        if (clickedCow && !clickedCow.isFed) {
          clickedCow.feed(camera.position);
          return; // Don't place blocks when feeding cows
        }
      }

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

      // Update cows
      const worldBounds = { min: -20, max: 20 };
      cows.forEach((cow) => {
        // Update follow target to current camera position if cow is fed
        if (cow.isFed && cow.followTarget) {
          cow.followTarget.copy(camera.position);
        }
        cow.update(delta, worldBounds);
      });

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

      // Clean up cows
      cows.forEach((cow) => {
        scene.remove(cow.mesh);
      });
      cows.clear();

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
              <li>Right Click Cow - Feed cow</li>
              <li>ESC - Exit</li>
            </ul>
            <div className="mt-3 pt-2 border-t border-gray-500">
              <p className="text-xs text-green-400">
                🐄 {cowsRef.current.size} Cows roaming
              </p>
              <p className="text-xs text-yellow-400">
                🌾{" "}
                {
                  Array.from(cowsRef.current.values()).filter(
                    (cow) => cow.isFed,
                  ).length
                }{" "}
                Fed cows following
              </p>
            </div>
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
