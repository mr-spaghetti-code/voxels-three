# Voxels Three Palaces

A 3D cellular automaton visualization using Three.js that generates and evolves voxel-based structures.

## Overview

This project implements a 3D cellular automaton system that creates and evolves voxel-based structures. It uses Three.js for 3D rendering and provides interactive controls to manipulate the visualization.

## Features

- **3D Cellular Automaton**: Implements various rules for 3D cellular automata evolution
- **Interactive Controls**: GUI controls for adjusting parameters in real-time
- **Multiple Rule Sets**: Includes various predefined rule sets (Custom, Lionel 1, Hollow, Clouds 1, Ruud, Maze, Labyrinth, Walled Cities)
- **Animation Controls**: Start/stop animation and adjust animation speed
- **Visual Customization**: Adjust material properties (metalness, roughness, exposure)
- **Camera Controls**: Auto-rotation and manual camera control via OrbitControls
- **Responsive Design**: Adapts to window resizing

## Controls

- **Space Bar**: Manually trigger one iteration of the cellular automaton
- **GUI Controls**:
  - **Rule**: Select from predefined rule sets
  - **Auto Rotate**: Toggle automatic rotation of the voxel structure
  - **Change Color**: Toggle color changes during evolution
  - **Metalness/Roughness**: Adjust material properties
  - **Exposure**: Adjust the overall brightness
  - **Animation Interval**: Control the speed of animation (100-5000ms)
  - **Animate Voxels**: Start/stop the automatic animation
  - **Rotate Voxels**: Toggle random rotation of individual voxels
  - **Max Iterations**: Set the maximum number of iterations (1-10)

## Rule Format

The cellular automaton rules follow this format:
```
/survival_conditions/birth_conditions/max_state/neighborhood_mode
```

Where:
- **survival_conditions**: Conditions for a cell to survive (e.g., "1-8" means survive with 1-8 neighbors)
- **birth_conditions**: Conditions for a dead cell to become alive (e.g., "2" means become alive with exactly 2 neighbors)
- **max_state**: Maximum state value for cells
- **neighborhood_mode**: "M" for Moore neighborhood (26 neighbors) or "N" for von Neumann neighborhood (6 neighbors)

## Getting Started

1. Clone this repository
2. Install dependencies (if any)
3. Open `index.html` in a web browser

## Dependencies

- Three.js
- lil-gui (for the control interface)

## License

[Specify your license here]

## Acknowledgements

[Add any acknowledgements here] 