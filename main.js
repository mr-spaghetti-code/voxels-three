import * as THREE from 'three';
// import { UltraHDRLoader } from 'three/addons/loaders/UltraHDRLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
// import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

const grid_size = 100;
const camera_distance = 2;
let camera_rotation = 0;
const camera_height = 0.3;
const rule = 4; // Ruud rule
const cut_out = 0;
const iterations = 1
const start_cells = 1; // Monument
const random_threshold = 0.3;
const MAX_ITERATIONS = 10;
let rotate_voxels = false;

let animationInterval = 1000; // 1 second (in milliseconds)

// Add a flag to control the animation state
let animateVoxels = false;

// Add an interval variable to store the interval ID
let animationIntervalId;


let grid_current = [];
let grid_previous = [];
let survive_list = [];
let birth_list = [];
let max_state = 1;
let neighborhood_mode = "M";

const rule_str_list = [
    "/1-8/2/M", // Custom
    "/1-2,6-10/5/M", // Lionel 1
    "/1-3/2/M", // Hollow
    "13-26/13-14,17-19/2/M", // Clouds 1
    "/1-8/2/M", // Ruud
    "/1-2,5,6,7,8,13,14,15/3/M", // Maze
    "/1-2,5,6,7,8,13,14,15/4/M", // Labyrinth
    "/1-2,5,6,7,8,13,14,15/5/M" // Walled Cities
];

const params = {
    animationInterval: animationInterval, // New parameter for animation interval
    animateVoxels: animateVoxels, // New parameter to toggle animation
    max_iterations: MAX_ITERATIONS, // Add a new parameter for max_iterations
    autoRotate: true,
    changeColor: true,
    metalness: 1.0,
    roughness: 0.0,
    exposure: 1.0,
    rotate_voxels: rotate_voxels,
    type: 'HalfFloatType',
    rule: rule // Add the current rule to params
};

// Create rule options for dropdown
const ruleOptions = {
    "Custom": 0,
    "Lionel 1": 1,
    "Hollow": 2,
    "Clouds 1": 3,
    "Ruud": 4,
    "Maze": 5,
    "Labyrinth": 6,
    "Walled Cities": 7
};

let rule_str = rule_str_list[rule];

// Three.js setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0); // Set background color to white
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = params.exposure;

// const environment = new RoomEnvironment();
// const pmremGenerator = new THREE.PMREMGenerator( renderer );

// scene.backgroundBlurriness = 0.5;
// const env = pmremGenerator.fromScene( environment ).texture;
// scene.background = env;
// scene.environment = env;
// environment.dispose();

const controls = new OrbitControls(camera, renderer.domElement);

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// loader = new UltraHDRLoader();
// loader.setDataType( THREE.FloatType );
// loader.setPath('textures/');


const ambient = new THREE.AmbientLight( 0xffffff, 3 );
scene.add( ambient );

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 1);
scene.add(directionalLight);

let color = new THREE.Color(0xff0000); // Start with red

// Create instanced mesh for voxels 
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

let instancedMesh;
const gui = new GUI();

gui.add( params, 'autoRotate' );
gui.add( params, 'changeColor' );
gui.add( params, 'metalness', 0, 1, 0.01 );
gui.add( params, 'roughness', 0, 1, 0.01 );
gui.add( params, 'exposure', 0, 4, 0.01 );

// Add rule selection to GUI as a dropdown
gui.add(params, 'rule', ruleOptions)
   .name('Rule')
   .onChange(val => {
       console.log("Rule changed to:", val);
       // Update the rule_str
       rule_str = rule_str_list[val];
       // Parse the new rule
       parseRule();
       // Reset animation state
       stopAnimation();
       params.animateVoxels = false;
       // Reinitialize the grid with the new rule
       initGrid();
       // Update the voxel mesh
       scene.remove(instancedMesh);
       createVoxelMesh();
   });

gui.add(params, 'animationInterval', 100, 5000, 100).onChange(val => {
    stopAnimation(); // Stop the current animation
    animationInterval = val; // Update the animation interval
    if (params.animateVoxels) {
        startAnimation(); // Restart the animation with the new interval
    }
});

// Add a GUI control to toggle the animation
gui.add(params, 'animateVoxels').onChange(val => {
    if (val) {
        startAnimation();
    } else {
        stopAnimation();
    }
});

gui.add(params, 'rotate_voxels').name('Rotate Voxels').onChange(val => {
    rotate_voxels = val;
    scene.remove(instancedMesh);
    createVoxelMesh();
});

gui.add(params, 'max_iterations', 1, 10, 1).onChange(val => {});

gui.open();

init();
animate();

// Add event listener for keydown event
window.addEventListener('keydown', handleKeyDown);

function handleKeyDown(event) {
  // Check if the pressed key is the space key
  if (event.code === 'Space') {
    iterateGrid();
  }
}

function iterateGrid() {
  let grid_tmp = grid_current;
  grid_current = grid_previous;
  grid_previous = grid_tmp;
  evolveGrid();

  // Update the instanced mesh
  updateVoxelMesh();

    
  color.offsetHSL(0.01, 0, 0);

  // Update the material color for all cube meshes
  if (params.changeColor) {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.material.color.set(color);
      }
    });
  }


  params.max_iterations--;

  // Stop the animation if max_iterations reaches 0
  if (params.max_iterations === 0) {
    stopAnimation();
  }
}

function updateVoxelMesh() {
  // Remove the existing instanced mesh
  scene.remove(instancedMesh);

  // Create a new instanced mesh
  createVoxelMesh();
}

function init() {
    initGrid();
    setupCamera();
    createVoxelMesh();
    const rgbeLoader = new RGBELoader();
    rgbeLoader.load( `textures/royal_esplanade_1k.hdr`, function ( texture ) {

        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.needsUpdate = true;

        scene.background = texture;
        scene.environment = texture;
        
        if (animateVoxels) {
            startAnimation();
        }

    } );
}

function startAnimation() {
    animationIntervalId = setInterval(iterateGrid, animationInterval);
}

function stopAnimation() {
    clearInterval(animationIntervalId);
}


function initGrid() {
    const model_monument = {
        size: [72, 72, 126],
        voxels:[0,10370,4,60,4]
    }
    grid_previous = Array.from({length: grid_size * grid_size * grid_size});
    grid_current = Array.from({length: grid_size * grid_size * grid_size}, () => 0);

    if (start_cells == 0) { 
        // Full cube random
        for (let z = 0; z < grid_size; z++) {
            for (let y = 0; y < grid_size; y++) {
                for (let x = 0; x < grid_size; x++) {
                    grid_current[index(x,y,z)] = Math.random() > random_threshold ? 1 : 0;
                }
            }
        }
    } else if (start_cells == 1) { 
        // Half cube random
        for (let z = 0; z < grid_size; z++) {
            for (let y = 0; y < grid_size; y++) {
                for (let x = 0; x < grid_size; x++) {
                    if ((Math.abs(x - grid_size / 2) < grid_size / 4) && 
                        (Math.abs(y - grid_size / 2) < grid_size / 4) && 
                        (Math.abs(z - grid_size / 2) < grid_size / 4)) {
                        grid_current[index(x,y,z)] = Math.random() > random_threshold ? 1 : 0;
                    }
                }
            }
        }
    } else if (start_cells == 2) { 
        // Single cell
        const center = Math.round(grid_size / 2);
        grid_current[index(center,center,center)] = 1;
    } else if (start_cells == 4) {
        // Monument model
        loadModel(model_monument);
    }

    parseRule();

    // Run iterations
    for (let i = 0; i < iterations; i++) {
        let grid_tmp = grid_current;
        grid_current = grid_previous;
        grid_previous = grid_tmp;
        evolveGrid();
    }

    applyCutOut();
}

function createVoxelMesh() {
    // Count active voxels
    let activeVoxels = 0;
    for (let i = 0; i < grid_current.length; i++) {
        if (grid_current[i] > 0) activeVoxels++;
    }
    const material = new THREE.MeshPhongMaterial({
        color: color,
        transparent: false,
        opacity: 0.5,
        reflectivity: 0.9,
        envMap: scene.environment // Use the environment map for reflections
    });

    // Create instanced mesh
    instancedMesh = new THREE.InstancedMesh(boxGeometry, material, activeVoxels);
    instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    instancedMesh.castShadow = true; // Enable shadow casting

    // Set transforms for each voxel
    const matrix = new THREE.Matrix4();
    const rotationMatrix = new THREE.Matrix4();
    let instanceIndex = 0;

    for (let z = 0; z < grid_size; z++) {
        for (let y = 0; y < grid_size; y++) {
            for (let x = 0; x < grid_size; x++) {
                if (grid_current[index(x, y, z)] > 0) {
                    matrix.setPosition(
                        x - grid_size/2,
                        y - grid_size/2,
                        z - grid_size/2
                    );
                    
                    if (params.rotate_voxels) {
                        // Random rotation between -30 and 30 degrees
                        const rotation = (Math.random() * 60 - 30) * Math.PI / 180;
                        rotationMatrix.makeRotationY(rotation);
                        matrix.multiply(rotationMatrix);
                    }
                    
                    instancedMesh.setMatrixAt(instanceIndex, matrix);
                    instanceIndex++;
                }
            }
        }
    }

    scene.add(instancedMesh);
}

function setupCamera() {
    const radius = grid_size * camera_distance;
    const xx = radius * Math.cos(camera_rotation * Math.PI * 2);
    const yy = radius * camera_height;
    const zz = radius * -Math.sin(camera_rotation * Math.PI * 2);
    
    // Update the camera position
    camera.position.set(xx + 0.5, yy + 0.5, zz + 0.5);
    
    // Update the camera target to look at the center of the grid
    const targetX = grid_size / 2;
    const targetY = grid_size / 2;
    const targetZ = grid_size / 2;
    camera.lookAt(targetX, targetY, targetZ);
}

function evolveGrid() {
    for (let z = 0; z < grid_size; z++) {
        for (let y = 0; y < grid_size; y++) {
            for (let x = 0; x < grid_size; x++) {
                const count = countNeighbors(x, y, z);
                grid_current[index(x, y, z)] = applyRule(grid_previous[index(x, y, z)], count);
            }
        }
    }
}

function applyRule(state, count) {
    if (state == 1) {
      for (let i = 0; i < survive_list.length; i++) {
        if (count == survive_list[i]) return 1;
      }
    } else if (state == 0) {
      for (let i = 0; i < birth_list.length; i++) {
        if (count == birth_list[i]) return 1;
      }
    }
  
    if (state > 0 && state + 1 <= max_state) return state + 1;
    
    return 0;
}  

function countNeighbors(x, y, z) {
    let count = 0;

    if (neighborhood_mode == "M") { // Moore neighborhood
        for (let dz = -1; dz <= 1; dz++) {
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx == 0 && dy == 0 && dz == 0) continue;
                    const xx = (x + dx + grid_size) % grid_size;
                    const yy = (y + dy + grid_size) % grid_size;
                    const zz = (z + dz + grid_size) % grid_size;
                    if (grid_previous[index(xx, yy, zz)] > 0) count++;
                }
            }
        }
    } else if (neighborhood_mode == "N") { // von Neumann neighborhood
        if (grid_previous[index((x-1+grid_size)%grid_size, y, z)] > 0) count++;
        if (grid_previous[index((x+1+grid_size)%grid_size, y, z)] > 0) count++;
        if (grid_previous[index(x, (y-1+grid_size)%grid_size, z)] > 0) count++;
        if (grid_previous[index(x, (y+1+grid_size)%grid_size, z)] > 0) count++;
        if (grid_previous[index(x, y, (z-1+grid_size)%grid_size)] > 0) count++;
        if (grid_previous[index(x, y, (z+1+grid_size)%grid_size)] > 0) count++;
    }

    return count;
}

function index(x, y, z) {
    return x + y * grid_size + z * grid_size * grid_size;
}

function parseRule() {
    survive_list = [];
    birth_list = [];
    max_state = 1;
    neighborhood_mode = "M";

    const phases = rule_str.split("/");
    if (phases.length != 4) return;

    survive_list = getList(phases[0]);
    birth_list = getList(phases[1]);
    max_state = parseInt(phases[2]) - 1;
    neighborhood_mode = phases[3];
}

function getList(str) {
    const list = [];
    const ranges = str.split(",");
    ranges.forEach(r => getRange(r).forEach(n => list.push(n)));
    return list;
}

function getRange(str) {
    if (str.length < 1) return [];
    const sides = str.split("-");
    if (sides.length == 2) {
        const list = [];
        const min = parseInt(sides[0]);
        const max = parseInt(sides[1]);
        for (let i = min; i <= max; i++) list.push(i);
        return list;
    }
    return [parseInt(sides[0])];
}

function applyCutOut() {
    if (cut_out > 0) {
        for (let z = 0; z < grid_size; z++) {
            for (let y = 0; y < grid_size; y++) {
                for (let x = 0; x < grid_size; x++) {
                    if ((grid_size-1-x) < grid_size*cut_out && 
                        (grid_size-1-y) < grid_size*cut_out && 
                        z < grid_size*cut_out) {
                        grid_current[index(x,y,z)] = 0;
                    }
                }
            }
        }
    }
}

function loadModel(model_vox) {
    const x_size = model_vox.size[0];
    const y_size = model_vox.size[1];
    const z_size = model_vox.size[2];

    let count_index = -1;
    let count_target = 0;
    let count = 0;
    let current = 1;

    for (let z = 0; z < z_size; z++) {
        for (let y = 0; y < y_size; y++) {
            for (let x = 0; x < x_size; x++) {
                while (count >= count_target) {
                    count_index++;
                    if (count_index >= model_vox.voxels.length) {
                        x = x_size;
                        y = y_size;
                        z = z_size;
                        break;
                    }
                    count = 0;
                    count_target = model_vox.voxels[count_index];
                    current = 1 - current;
                }
                count++;

                const xx = x - Math.floor(x_size / 2) + Math.floor(grid_size / 2);
                const yy = y - Math.floor(y_size / 2) + Math.floor(grid_size / 2);
                const zz = z - Math.floor(z_size / 2) + Math.floor(grid_size / 2);

                if (xx > 0 && yy > 0 && zz > 0 && xx < grid_size && yy < grid_size && zz < grid_size) {
                    grid_current[index(yy,zz,xx)] = current;
                }
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    if ( params.autoRotate ) {

        instancedMesh.rotation.y += 0.001;

    }


    controls.update();

    renderer.render(scene, camera);
}

// Handle window resizing
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

