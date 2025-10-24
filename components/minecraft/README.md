# Minecraft Clone

A browser-based Minecraft clone built with Three.js and React, hosted at the `/protected` route.

## Features

- **3D Voxel World**: Procedurally generated terrain with grass, dirt, stone, wood, and leaves blocks
- **First-Person Controls**: WASD movement with mouse look
- **Block Building**: Place and remove blocks with left/right click
- **Multiple Block Types**: Choose from 5 different block types
- **Trees**: Randomly generated trees throughout the world
- **Realistic Lighting**: Ambient and directional lighting with shadows

## Controls

- **WASD** - Move forward/backward/left/right
- **Space** - Move up
- **Shift** - Move down
- **Mouse** - Look around (after clicking to lock pointer)
- **Left Click** - Remove block
- **Right Click** - Place block
- **ESC** - Exit pointer lock mode

## Block Types

1. **Grass** - Green blocks for terrain surface
2. **Dirt** - Brown blocks for underground
3. **Stone** - Gray blocks for deep underground
4. **Wood** - Brown blocks for tree trunks
5. **Leaves** - Green blocks for tree foliage

## Technical Details

- Built with Three.js for 3D rendering
- Uses React hooks for state management
- Implements pointer lock API for first-person controls
- Raycasting for block selection and placement
- Procedural terrain generation using simple noise functions

## Getting Started

1. Navigate to `/protected` route (requires authentication)
2. Click anywhere on the game area to start
3. Use mouse to look around and WASD to move
4. Select block type from the right panel
5. Left click to remove blocks, right click to place them

## Performance Notes

- World size is limited to 41x41 blocks for optimal performance
- Blocks are rendered as individual meshes for simplicity
- Consider implementing chunk-based rendering for larger worlds

## Future Enhancements

- Inventory system
- More block types and textures
- Multiplayer support
- Save/load world functionality
- Physics simulation
- Mob entities
- Day/night cycle