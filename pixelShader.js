// DOM Elements
const canvas = document.getElementById('canvas');
const gl = canvas.getContext('webgl', {preserveDrawingBuffer: false}) || canvas.getContext('experimental-webgl');
const fileInput = document.getElementById('fileInput');
const inputToggle = document.getElementById('inputToggle');
let currentVideo = null;
let isWebcam = true;
let animationPlayToggle = false;
let animationRequest;
let isMobileFlag = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log("Mobile?: "+isMobileFlag);

let userVideo = document.getElementById('userVideo');
let defaultVideo = document.getElementById('defaultVideo');
let defaultVideoWidth = 900;
let defaultVideoHeight = 504;
let maxCanvasWidth = 1200;

if (!gl) {
  alert('WebGL not supported');
  throw new Error('WebGL not supported');
}

//add gui
let paletteNames = ["custom","field","underwater","forest","flame","dusk","grayscale",
  "vampire","ink","galaxy","acid","sand"];

let obj = {
  pixelSize: 15,
  ditherFactor: 0.20,
  colorPalette: "custom",
  edgeThreshold: 0.3,
  edgeIntensity: 0.5,
  edgeColor: [255, 255, 255],
  // Cursor dither trail effect
  cursorDitherBoost: 1.25, // drives a grid-aligned *pixel interaction* effect (edge punch)
};

let gui = new dat.gui.GUI( { autoPlace: false } );
// gui.close();
let guiOpenToggle = true;

obj['useWebcam'] = function () {
  useWebcam();
};
gui.add(obj, 'useWebcam').name('Use Webcam');

obj['uploadVideo'] = function () {
  fileInput.click();
};
gui.add(obj, 'uploadVideo').name('Upload Video');

obj['uploadImage'] = function () {
  const imageInput = document.getElementById('imageInput');
  imageInput.click();
};
gui.add(obj, 'uploadImage').name('Upload Image');

gui.add(obj, "pixelSize").min(1).max(100).step(1).name('Pixel Size').listen();
gui.add(obj, "ditherFactor").min(0).max(1).step(0.01).name('Dither Strength').listen();
gui.add(obj, "cursorDitherBoost").min(0).max(3).step(0.01).name('Cursor Effect Strength').listen();
gui.add(obj, "colorPalette", paletteNames).listen();
gui.add(obj, "edgeThreshold").min(0.01).max(0.5).step(0.01).name('Edge Threshold').listen();
gui.add(obj, "edgeIntensity").min(0).max(1).step(0.01).name('Edge Intensity').listen();
gui.addColor(obj, "edgeColor").name('Edge Color').listen();

obj['randomizeInputs'] = function () {
  randomizeInputs();
};
gui.add(obj, 'randomizeInputs').name("Randomize Inputs (r)");

obj['pausePlay'] = function () {
  toggleAnimationPlay();
};
gui.add(obj, 'pausePlay').name("Pause/Play (p)");

obj['saveImage'] = function () {
  saveImage();
};
gui.add(obj, 'saveImage').name("Save Image (s)");

obj['saveVideo'] = function () {
  toggleVideoRecord();
};
gui.add(obj, 'saveVideo').name("Video Export (v)");

customContainer = document.getElementById( 'gui' );
customContainer.appendChild(gui.domElement);

// Define color palettes
const palettes = {
    0: [
        [0.031, 0.302, 0.969], // #084DF7 - Bright blue
        [0.031, 0.196, 0.627], // #0532A0 - Dark blue
        [0.063, 0.365, 0.788], // #105DC9 - Medium blue
        [0.600, 0.600, 0.620], // #99999E - Light medium grey
        [0.750, 0.750, 0.765], // #BFBFC3 - Light grey
        [0.933, 0.929, 0.957], // #EEEDF4 - Very light gray
        [0.984, 0.886, 0.588], // #FBE296 - Light yellow
        [0.902, 0.380, 0.863], // #E661DC - Bright pink (accent)
        [1.000, 0.875, 1.000], // #FFDEFF - Very light pink
        [0.120, 0.120, 0.140], // #1E1E24 - Very dark grey
    ],
    1: [
        [0.973, 0.784, 0.200], // #F8C833 - Bright yellow
        [0.984, 0.886, 0.588], // #FBE296 - Light yellow
        [0.902, 0.380, 0.863], // #E661DC - Bright pink
        [1.000, 0.875, 1.000], // #FFDEFF - Very light pink
        [0.918, 0.016, 0.827], // #EA04D3 - Hot pink/magenta
        [0.031, 0.302, 0.969], // #084DF7 - Bright blue
        [0.173, 0.133, 0.204], // #2C2234 - Dark purple
        [0.196, 0.133, 0.129], // #322221 - Dark brown
        [0.933, 0.929, 0.957], // #EEEDF4 - Very light gray
        [0.769, 0.651, 0.855], // #C4A6DA - Light purple
    ],
    2: [
        [0.118, 0.471, 0.706], // Deep blue
        [0.173, 0.612, 0.620], // Teal
        [0.255, 0.757, 0.678], // Light teal
        [1.000, 0.412, 0.380], // Coral red
        [0.957, 0.643, 0.376], // Coral orange
        [0.824, 0.369, 0.584], // Purple coral
        [0.467, 0.745, 0.851], // Light blue
        [0.298, 0.180, 0.247], // Deep purple
        [0.925, 0.941, 0.945], // White
        [0.078, 0.110, 0.141]  // Dark blue
    ],
    3: [
        [0.133, 0.184, 0.133], // Dark green
        [0.255, 0.369, 0.196], // Mid green
        [0.475, 0.557, 0.286], // Light green
        [0.702, 0.639, 0.298], // Yellow-green
        [0.408, 0.314, 0.235], // Brown
        [0.573, 0.439, 0.322], // Light brown
        [0.765, 0.765, 0.847], // Light blue
        [0.631, 0.631, 0.737], // Misty blue
        [0.871, 0.886, 0.894], // White
        [0.424, 0.459, 0.404]  // Gray green
    ],
    4: [
        [1.000, 0.439, 0.122], // Bright orange
        [0.961, 0.647, 0.263], // Light orange
        [1.000, 0.843, 0.000], // Sun yellow
        [0.702, 0.341, 0.165], // Dark orange
        [0.529, 0.220, 0.196], // Dark red
        [0.231, 0.184, 0.235], // Dark purple
        [0.333, 0.278, 0.365], // Mountain purple
        [0.455, 0.376, 0.490], // Light purple
        [0.098, 0.098, 0.137], // Near black
        [0.835, 0.584, 0.310]  // Gold
    ],
    5: [
        [0.039, 0.039, 0.078], // Night blue
        [0.118, 0.157, 0.275], // Deep blue
        [0.275, 0.196, 0.408], // Purple blue
        [0.839, 0.424, 0.400], // Coral
        [0.957, 0.576, 0.447], // Light coral
        [1.000, 0.871, 0.678], // Light yellow
        [0.173, 0.220, 0.369], // City blue
        [0.471, 0.349, 0.557], // Mid purple
        [1.000, 1.000, 1.000], // White
        [0.557, 0.612, 0.722]  // Light blue
    ],
    6: [
        [0.000, 0.000, 0.000], // Black
        [0.000, 0.000, 0.000], // Black
        [0.000, 0.000, 0.000], // Black
        [0.000, 0.000, 0.000], // Black
        [0.000, 0.000, 0.000], // Black
        [0.000, 0.000, 0.000], // Black
        [0.000, 0.000, 0.000], // Black
        [0.000, 0.000, 0.000], // Black
        [0.000, 0.000, 0.000], // Black
        [1.000, 1.000, 1.000]  // White
    ],
    7: [
      [0.059, 0.063, 0.082],  // Deep dark background
      [0.118, 0.125, 0.157],  // Dark blue-gray
      [0.196, 0.208, 0.255],  // Light blue highlights
      [0.157, 0.165, 0.196],  // Medium blue-gray
      [0.392, 0.059, 0.078],  // Dark red
      [0.784, 0.118, 0.157],  // Medium red
      [0.902, 0.235, 0.196],  // Bright red
      [1.000, 0.392, 0.275],  // Orange-red glow
      [1.000, 0.627, 0.431],  // Light orange highlight
      [1.000, 0.824, 0.667]   // Pale orange glow
    ],
    8: [
      [0.031, 0.031, 0.031],  // Deep black background
      [0.118, 0.098, 0.118],  // Dark purple-gray (shadows)
      [0.275, 0.157, 0.196],  // Dark burgundy (clothing)
      [0.431, 0.196, 0.235],  // Medium red (mushroom cap)
      [0.784, 0.275, 0.314],  // Bright red (mushroom highlights)
      [0.392, 0.275, 0.196],  // Brown (staff/leather)
      [0.549, 0.510, 0.431],  // Light gray (mushroom underside)
      [0.627, 0.706, 0.235],  // Bright green (leaves/moss)
      [0.824, 0.824, 0.824],  // White (highlights)
      [1.000, 1.000, 1.000]   // Pure white (spots/outline)
    ],
    9: [
      [0.020, 0.024, 0.078],  // Deep navy background
      [0.039, 0.047, 0.157],  // Dark blue (outer edge)
      [0.078, 0.118, 0.314],  // Medium blue
      [0.157, 0.235, 0.627],  // Bright blue
      [0.314, 0.431, 0.902],  // Light blue glow
      [0.784, 0.275, 0.431],  // Dark pink
      [0.980, 0.392, 0.549],  // Bright pink
      [0.980, 0.706, 0.431],  // Orange/yellow
      [1.000, 0.863, 0.627],  // Light yellow
      [1.000, 1.000, 1.000]   // Pure white highlights
    ],
    10: [
      [0.031, 0.027, 0.035],  // Deep black
      [0.157, 0.118, 0.196],  // Dark purple
      [0.235, 0.392, 0.902],  // Bright blue
      [0.431, 0.314, 0.784],  // Medium purple
      [0.902, 0.431, 0.784],  // Bright pink
      [0.980, 0.549, 0.902],  // Light pink
      [0.196, 0.784, 0.314],  // Bright green
      [0.980, 0.784, 0.196],  // Yellow/orange
      [0.902, 0.902, 0.980],  // Light blue/white
      [1.000, 1.000, 1.000]   // Pure white highlights
    ],
    11: [
      [0.231, 0.141, 0.090],  // Deep Walnut
      [0.361, 0.227, 0.129],  // Dark Oak
      [0.545, 0.271, 0.075],  // Rustic Brown
      [0.627, 0.322, 0.176],  // Warm Umber
      [0.737, 0.561, 0.561],  // Cedar
      [0.824, 0.706, 0.549],  // Desert Sand
      [0.871, 0.722, 0.529],  // Wheat
      [0.933, 0.796, 0.678],  // Pale Almond
      [0.980, 0.922, 0.843],  // Antique White
      [1.000, 1.000, 0.941]   // Ivory
    ],
};

// Helper function to generate shader color definitions
function createPaletteDefinitions() {
    let defs = '';
    Object.entries(palettes).forEach(([name, colors], index) => {
        colors.forEach((color, i) => {
            defs += `const vec3 c${index}_${i} = vec3(${color[0].toFixed(3)}, ${color[1].toFixed(3)}, ${color[2].toFixed(3)});\n`;
        });
        defs += '\n';
    });
    return defs;
}

const vertexShaderSource = `
    attribute vec2 position;
    attribute vec2 texCoord;
    varying vec2 vTexCoord;
    void main() {
        gl_Position = vec4(position, 0.0, 1.0);
        vTexCoord = texCoord;
    }
`;

const fragmentShaderSource = `
    precision mediump float;
    varying vec2 vTexCoord;
    uniform sampler2D uTexture;
    // Cursor dither trail mask (alpha channel)
    uniform sampler2D uTrail;
    uniform vec2 trailResolution;
    uniform vec2 trailScale;
    uniform vec2 resolution;
    uniform float pixelSize;
    uniform float ditherFactor;
    // Multiplier for additional dithering where the trail mask is present
    uniform float cursorDitherBoost;
    uniform float time;
    uniform int paletteChoice;
    uniform float edgeThreshold;
    uniform float edgeIntensity;
    uniform vec3 edgeColor;

    ${createPaletteDefinitions()}

    // Sobel operator kernels
    mat3 sobelX = mat3(
        -1.0, 0.0, 1.0,
        -2.0, 0.0, 2.0,
        -1.0, 0.0, 1.0
    );

    mat3 sobelY = mat3(
        -1.0, -2.0, -1.0,
         0.0,  0.0,  0.0,
         1.0,  2.0,  1.0
    );

    // Helper function to get grayscale value
    float getLuminance(vec3 color) {
        return dot(color, vec3(0.299, 0.587, 0.114));
    }

    // Edge detection function
    float detectEdge(vec2 coord) {
        float pixelWidth = 1.0 / resolution.x;
        float pixelHeight = 1.0 / resolution.y;
        
        float gx = 0.0;
        float gy = 0.0;
        
        // Apply Sobel operator
        for(int i = -1; i <= 1; i++) {
            for(int j = -1; j <= 1; j++) {
                vec2 offset = vec2(float(i) * pixelWidth, float(j) * pixelHeight);
                vec3 color = texture2D(uTexture, coord + offset).rgb;
                float luminance = getLuminance(color);
                
                gx += luminance * sobelX[i+1][j+1];
                gy += luminance * sobelY[i+1][j+1];
            }
        }
        
        return sqrt(gx * gx + gy * gy);
    }

    vec3 findClosestColor(vec3 color) {
        float minDist = 1000.0;
        vec3 closestColor;
        float dist;

        if (paletteChoice == 0) {
            // field
            dist = distance(color, c0_0); if(dist < minDist) { minDist = dist; closestColor = c0_0; }
            dist = distance(color, c0_1); if(dist < minDist) { minDist = dist; closestColor = c0_1; }
            dist = distance(color, c0_2); if(dist < minDist) { minDist = dist; closestColor = c0_2; }
            dist = distance(color, c0_3); if(dist < minDist) { minDist = dist; closestColor = c0_3; }
            dist = distance(color, c0_4); if(dist < minDist) { minDist = dist; closestColor = c0_4; }
            dist = distance(color, c0_5); if(dist < minDist) { minDist = dist; closestColor = c0_5; }
            dist = distance(color, c0_6); if(dist < minDist) { minDist = dist; closestColor = c0_6; }
            dist = distance(color, c0_7); if(dist < minDist) { minDist = dist; closestColor = c0_7; }
            dist = distance(color, c0_8); if(dist < minDist) { minDist = dist; closestColor = c0_8; }
            dist = distance(color, c0_9); if(dist < minDist) { minDist = dist; closestColor = c0_9; }
        } else if (paletteChoice == 1) {
            // Underwater
            dist = distance(color, c1_0); if(dist < minDist) { minDist = dist; closestColor = c1_0; }
            dist = distance(color, c1_1); if(dist < minDist) { minDist = dist; closestColor = c1_1; }
            dist = distance(color, c1_2); if(dist < minDist) { minDist = dist; closestColor = c1_2; }
            dist = distance(color, c1_3); if(dist < minDist) { minDist = dist; closestColor = c1_3; }
            dist = distance(color, c1_4); if(dist < minDist) { minDist = dist; closestColor = c1_4; }
            dist = distance(color, c1_5); if(dist < minDist) { minDist = dist; closestColor = c1_5; }
            dist = distance(color, c1_6); if(dist < minDist) { minDist = dist; closestColor = c1_6; }
            dist = distance(color, c1_7); if(dist < minDist) { minDist = dist; closestColor = c1_7; }
            dist = distance(color, c1_8); if(dist < minDist) { minDist = dist; closestColor = c1_8; }
            dist = distance(color, c1_9); if(dist < minDist) { minDist = dist; closestColor = c1_9; }
        } else if (paletteChoice == 2) {
            // Forest
            dist = distance(color, c2_0); if(dist < minDist) { minDist = dist; closestColor = c2_0; }
            dist = distance(color, c2_1); if(dist < minDist) { minDist = dist; closestColor = c2_1; }
            dist = distance(color, c2_2); if(dist < minDist) { minDist = dist; closestColor = c2_2; }
            dist = distance(color, c2_3); if(dist < minDist) { minDist = dist; closestColor = c2_3; }
            dist = distance(color, c2_4); if(dist < minDist) { minDist = dist; closestColor = c2_4; }
            dist = distance(color, c2_5); if(dist < minDist) { minDist = dist; closestColor = c2_5; }
            dist = distance(color, c2_6); if(dist < minDist) { minDist = dist; closestColor = c2_6; }
            dist = distance(color, c2_7); if(dist < minDist) { minDist = dist; closestColor = c2_7; }
            dist = distance(color, c2_8); if(dist < minDist) { minDist = dist; closestColor = c2_8; }
            dist = distance(color, c2_9); if(dist < minDist) { minDist = dist; closestColor = c2_9; }
        } else if (paletteChoice == 3) {
            // Flame
            dist = distance(color, c3_0); if(dist < minDist) { minDist = dist; closestColor = c3_0; }
            dist = distance(color, c3_1); if(dist < minDist) { minDist = dist; closestColor = c3_1; }
            dist = distance(color, c3_2); if(dist < minDist) { minDist = dist; closestColor = c3_2; }
            dist = distance(color, c3_3); if(dist < minDist) { minDist = dist; closestColor = c3_3; }
            dist = distance(color, c3_4); if(dist < minDist) { minDist = dist; closestColor = c3_4; }
            dist = distance(color, c3_5); if(dist < minDist) { minDist = dist; closestColor = c3_5; }
            dist = distance(color, c3_6); if(dist < minDist) { minDist = dist; closestColor = c3_6; }
            dist = distance(color, c3_7); if(dist < minDist) { minDist = dist; closestColor = c3_7; }
            dist = distance(color, c3_8); if(dist < minDist) { minDist = dist; closestColor = c3_8; }
            dist = distance(color, c3_9); if(dist < minDist) { minDist = dist; closestColor = c3_9; }
        } else if (paletteChoice == 4) {
            // Dusk
            dist = distance(color, c4_0); if(dist < minDist) { minDist = dist; closestColor = c4_0; }
            dist = distance(color, c4_1); if(dist < minDist) { minDist = dist; closestColor = c4_1; }
            dist = distance(color, c4_2); if(dist < minDist) { minDist = dist; closestColor = c4_2; }
            dist = distance(color, c4_3); if(dist < minDist) { minDist = dist; closestColor = c4_3; }
            dist = distance(color, c4_4); if(dist < minDist) { minDist = dist; closestColor = c4_4; }
            dist = distance(color, c4_5); if(dist < minDist) { minDist = dist; closestColor = c4_5; }
            dist = distance(color, c4_6); if(dist < minDist) { minDist = dist; closestColor = c4_6; }
            dist = distance(color, c4_7); if(dist < minDist) { minDist = dist; closestColor = c4_7; }
            dist = distance(color, c4_8); if(dist < minDist) { minDist = dist; closestColor = c4_8; }
            dist = distance(color, c4_9); if(dist < minDist) { minDist = dist; closestColor = c4_9; }
        } else if (paletteChoice == 5) {
            // Grayscale
            dist = distance(color, c5_0); if(dist < minDist) { minDist = dist; closestColor = c5_0; }
            dist = distance(color, c5_1); if(dist < minDist) { minDist = dist; closestColor = c5_1; }
            dist = distance(color, c5_2); if(dist < minDist) { minDist = dist; closestColor = c5_2; }
            dist = distance(color, c5_3); if(dist < minDist) { minDist = dist; closestColor = c5_3; }
            dist = distance(color, c5_4); if(dist < minDist) { minDist = dist; closestColor = c5_4; }
            dist = distance(color, c5_5); if(dist < minDist) { minDist = dist; closestColor = c5_5; }
            dist = distance(color, c5_6); if(dist < minDist) { minDist = dist; closestColor = c5_6; }
            dist = distance(color, c5_7); if(dist < minDist) { minDist = dist; closestColor = c5_7; }
            dist = distance(color, c5_8); if(dist < minDist) { minDist = dist; closestColor = c5_8; }
            dist = distance(color, c5_9); if(dist < minDist) { minDist = dist; closestColor = c5_9; }
        } else if (paletteChoice == 6) {
            // Vampire
            dist = distance(color, c6_0); if(dist < minDist) { minDist = dist; closestColor = c6_0; }
            dist = distance(color, c6_1); if(dist < minDist) { minDist = dist; closestColor = c6_1; }
            dist = distance(color, c6_2); if(dist < minDist) { minDist = dist; closestColor = c6_2; }
            dist = distance(color, c6_3); if(dist < minDist) { minDist = dist; closestColor = c6_3; }
            dist = distance(color, c6_4); if(dist < minDist) { minDist = dist; closestColor = c6_4; }
            dist = distance(color, c6_5); if(dist < minDist) { minDist = dist; closestColor = c6_5; }
            dist = distance(color, c6_6); if(dist < minDist) { minDist = dist; closestColor = c6_6; }
            dist = distance(color, c6_7); if(dist < minDist) { minDist = dist; closestColor = c6_7; }
            dist = distance(color, c6_8); if(dist < minDist) { minDist = dist; closestColor = c6_8; }
            dist = distance(color, c6_9); if(dist < minDist) { minDist = dist; closestColor = c6_9; }
        } else if (paletteChoice == 7){
            // Ink
            dist = distance(color, c7_0); if(dist < minDist) { minDist = dist; closestColor = c7_0; }
            dist = distance(color, c7_1); if(dist < minDist) { minDist = dist; closestColor = c7_1; }
            dist = distance(color, c7_2); if(dist < minDist) { minDist = dist; closestColor = c7_2; }
            dist = distance(color, c7_3); if(dist < minDist) { minDist = dist; closestColor = c7_3; }
            dist = distance(color, c7_4); if(dist < minDist) { minDist = dist; closestColor = c7_4; }
            dist = distance(color, c7_5); if(dist < minDist) { minDist = dist; closestColor = c7_5; }
            dist = distance(color, c7_6); if(dist < minDist) { minDist = dist; closestColor = c7_6; }
            dist = distance(color, c7_7); if(dist < minDist) { minDist = dist; closestColor = c7_7; }
            dist = distance(color, c7_8); if(dist < minDist) { minDist = dist; closestColor = c7_8; }
            dist = distance(color, c7_9); if(dist < minDist) { minDist = dist; closestColor = c7_9; }
        } else if (paletteChoice == 8){
            // Galaxy
            dist = distance(color, c8_0); if(dist < minDist) { minDist = dist; closestColor = c8_0; }
            dist = distance(color, c8_1); if(dist < minDist) { minDist = dist; closestColor = c8_1; }
            dist = distance(color, c8_2); if(dist < minDist) { minDist = dist; closestColor = c8_2; }
            dist = distance(color, c8_3); if(dist < minDist) { minDist = dist; closestColor = c8_3; }
            dist = distance(color, c8_4); if(dist < minDist) { minDist = dist; closestColor = c8_4; }
            dist = distance(color, c8_5); if(dist < minDist) { minDist = dist; closestColor = c8_5; }
            dist = distance(color, c8_6); if(dist < minDist) { minDist = dist; closestColor = c8_6; }
            dist = distance(color, c8_7); if(dist < minDist) { minDist = dist; closestColor = c8_7; }
            dist = distance(color, c8_8); if(dist < minDist) { minDist = dist; closestColor = c8_8; }
            dist = distance(color, c8_9); if(dist < minDist) { minDist = dist; closestColor = c8_9; }
        } else if (paletteChoice == 9){
            // acid
            dist = distance(color, c9_0); if(dist < minDist) { minDist = dist; closestColor = c9_0; }
            dist = distance(color, c9_1); if(dist < minDist) { minDist = dist; closestColor = c9_1; }
            dist = distance(color, c9_2); if(dist < minDist) { minDist = dist; closestColor = c9_2; }
            dist = distance(color, c9_3); if(dist < minDist) { minDist = dist; closestColor = c9_3; }
            dist = distance(color, c9_4); if(dist < minDist) { minDist = dist; closestColor = c9_4; }
            dist = distance(color, c9_5); if(dist < minDist) { minDist = dist; closestColor = c9_5; }
            dist = distance(color, c9_6); if(dist < minDist) { minDist = dist; closestColor = c9_6; }
            dist = distance(color, c9_7); if(dist < minDist) { minDist = dist; closestColor = c9_7; }
            dist = distance(color, c9_8); if(dist < minDist) { minDist = dist; closestColor = c9_8; }
            dist = distance(color, c9_9); if(dist < minDist) { minDist = dist; closestColor = c9_9; }
        } else if (paletteChoice == 10){
            // sand
            dist = distance(color, c10_0); if(dist < minDist) { minDist = dist; closestColor = c10_0; }
            dist = distance(color, c10_1); if(dist < minDist) { minDist = dist; closestColor = c10_1; }
            dist = distance(color, c10_2); if(dist < minDist) { minDist = dist; closestColor = c10_2; }
            dist = distance(color, c10_3); if(dist < minDist) { minDist = dist; closestColor = c10_3; }
            dist = distance(color, c10_4); if(dist < minDist) { minDist = dist; closestColor = c10_4; }
            dist = distance(color, c10_5); if(dist < minDist) { minDist = dist; closestColor = c10_5; }
            dist = distance(color, c10_6); if(dist < minDist) { minDist = dist; closestColor = c10_6; }
            dist = distance(color, c10_7); if(dist < minDist) { minDist = dist; closestColor = c10_7; }
            dist = distance(color, c10_8); if(dist < minDist) { minDist = dist; closestColor = c10_8; }
            dist = distance(color, c10_9); if(dist < minDist) { minDist = dist; closestColor = c10_9; }
        }
        
        return closestColor;
    }

    float mod2(float x, float y) {
        return x - y * floor(x/y);
    }

    // 4x4 Bayer matrix indexed using mod2
    float getBayerValue(vec2 coord) {
        float x = mod2(coord.x, 4.0);
        float y = mod2(coord.y, 4.0);
        
        if(x < 1.0) {
            if(y < 1.0) return 0.0/16.0;
            else if(y < 2.0) return 12.0/16.0;
            else if(y < 3.0) return 3.0/16.0;
            else return 15.0/16.0;
        } 
        else if(x < 2.0) {
            if(y < 1.0) return 8.0/16.0;
            else if(y < 2.0) return 4.0/16.0;
            else if(y < 3.0) return 11.0/16.0;
            else return 7.0/16.0;
        }
        else if(x < 3.0) {
            if(y < 1.0) return 2.0/16.0;
            else if(y < 2.0) return 14.0/16.0;
            else if(y < 3.0) return 1.0/16.0;
            else return 13.0/16.0;
        }
        else {
            if(y < 1.0) return 10.0/16.0;
            else if(y < 2.0) return 6.0/16.0;
            else if(y < 3.0) return 9.0/16.0;
            else return 5.0/16.0;
        }
    }

    // Hash function for stable pseudo-random per cell (0..1)
    float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
    }

    // Return a palette color by index (0..9) for the active paletteChoice
    vec3 getPaletteColorByIndex(int idx) {
        // field
        if (paletteChoice == 0) {
            if (idx == 0) return c0_0; if (idx == 1) return c0_1; if (idx == 2) return c0_2; if (idx == 3) return c0_3; if (idx == 4) return c0_4;
            if (idx == 5) return c0_5; if (idx == 6) return c0_6; if (idx == 7) return c0_7; if (idx == 8) return c0_8; return c0_9;
        }
        // Underwater
        if (paletteChoice == 1) {
            if (idx == 0) return c1_0; if (idx == 1) return c1_1; if (idx == 2) return c1_2; if (idx == 3) return c1_3; if (idx == 4) return c1_4;
            if (idx == 5) return c1_5; if (idx == 6) return c1_6; if (idx == 7) return c1_7; if (idx == 8) return c1_8; return c1_9;
        }
        // Forest
        if (paletteChoice == 2) {
            if (idx == 0) return c2_0; if (idx == 1) return c2_1; if (idx == 2) return c2_2; if (idx == 3) return c2_3; if (idx == 4) return c2_4;
            if (idx == 5) return c2_5; if (idx == 6) return c2_6; if (idx == 7) return c2_7; if (idx == 8) return c2_8; return c2_9;
        }
        // Flame
        if (paletteChoice == 3) {
            if (idx == 0) return c3_0; if (idx == 1) return c3_1; if (idx == 2) return c3_2; if (idx == 3) return c3_3; if (idx == 4) return c3_4;
            if (idx == 5) return c3_5; if (idx == 6) return c3_6; if (idx == 7) return c3_7; if (idx == 8) return c3_8; return c3_9;
        }
        // Dusk
        if (paletteChoice == 4) {
            if (idx == 0) return c4_0; if (idx == 1) return c4_1; if (idx == 2) return c4_2; if (idx == 3) return c4_3; if (idx == 4) return c4_4;
            if (idx == 5) return c4_5; if (idx == 6) return c4_6; if (idx == 7) return c4_7; if (idx == 8) return c4_8; return c4_9;
        }
        // Grayscale
        if (paletteChoice == 5) {
            if (idx == 0) return c5_0; if (idx == 1) return c5_1; if (idx == 2) return c5_2; if (idx == 3) return c5_3; if (idx == 4) return c5_4;
            if (idx == 5) return c5_5; if (idx == 6) return c5_6; if (idx == 7) return c5_7; if (idx == 8) return c5_8; return c5_9;
        }
        // Vampire
        if (paletteChoice == 6) {
            if (idx == 0) return c6_0; if (idx == 1) return c6_1; if (idx == 2) return c6_2; if (idx == 3) return c6_3; if (idx == 4) return c6_4;
            if (idx == 5) return c6_5; if (idx == 6) return c6_6; if (idx == 7) return c6_7; if (idx == 8) return c6_8; return c6_9;
        }
        // Ink
        if (paletteChoice == 7) {
            if (idx == 0) return c7_0; if (idx == 1) return c7_1; if (idx == 2) return c7_2; if (idx == 3) return c7_3; if (idx == 4) return c7_4;
            if (idx == 5) return c7_5; if (idx == 6) return c7_6; if (idx == 7) return c7_7; if (idx == 8) return c7_8; return c7_9;
        }
        // Galaxy
        if (paletteChoice == 8) {
            if (idx == 0) return c8_0; if (idx == 1) return c8_1; if (idx == 2) return c8_2; if (idx == 3) return c8_3; if (idx == 4) return c8_4;
            if (idx == 5) return c8_5; if (idx == 6) return c8_6; if (idx == 7) return c8_7; if (idx == 8) return c8_8; return c8_9;
        }
        // Acid
        if (paletteChoice == 9) {
            if (idx == 0) return c9_0; if (idx == 1) return c9_1; if (idx == 2) return c9_2; if (idx == 3) return c9_3; if (idx == 4) return c9_4;
            if (idx == 5) return c9_5; if (idx == 6) return c9_6; if (idx == 7) return c9_7; if (idx == 8) return c9_8; return c9_9;
        }
        // Sand
        if (paletteChoice == 10) {
            if (idx == 0) return c10_0; if (idx == 1) return c10_1; if (idx == 2) return c10_2; if (idx == 3) return c10_3; if (idx == 4) return c10_4;
            if (idx == 5) return c10_5; if (idx == 6) return c10_6; if (idx == 7) return c10_7; if (idx == 8) return c10_8; return c10_9;
        }

        // Fallback
        return vec3(1.0, 1.0, 1.0);
    }

    void main() {
        vec2 pixelatedCoord = floor(vTexCoord * resolution / pixelSize) * pixelSize / resolution;
        vec4 color = texture2D(uTexture, pixelatedCoord);

        // Cursor trail mask sampled in *pixel-grid* space so it snaps to the active pixelation grid.
        vec2 cell = floor(vTexCoord * resolution / pixelSize);
        vec2 trailUV = (cell * trailScale + 0.5) / trailResolution;
        float trailMask = step(0.5, texture2D(uTrail, trailUV).a);

        // Edge detection + cursor trail (grid-aligned).
        // The trail changes whole pixel blocks (not partial fragments), using colors from the active palette.
        float edge = detectEdge(pixelatedCoord);

        // Trail color: fixed accent color (#E661DC)
vec3 trailColor = vec3(0.902, 0.380, 0.863);

// Keep the subtle "alive" variation via strength modulation, but the hue stays constant.
float tstep = floor(time * 12.0); // ~12Hz change
float r1 = hash21(cell + vec2(tstep, tstep * 0.37));

// Sometimes 70% strength, sometimes 100%, for a consistent but shifting feel.
float alphaPick = mix(0.7, 1.0, step(0.55, r1));

// 100% effect strength when mask is present (binary)
float trailStrength = clamp(trailMask * cursorDitherBoost * 0.85 * alphaPick, 0.0, 0.95);


        // Make edges a bit more likely/stronger under the trail, but keep it subtle.
        float localEdgeThreshold = max(0.01, edgeThreshold * (1.0 - 0.35 * trailStrength));
        float localEdgeIntensity = clamp(edgeIntensity + 0.35 * trailStrength, 0.0, 1.0);
        bool isEdge = edge > localEdgeThreshold;

        // Get the dither threshold using screen coordinates
        float threshold = getBayerValue(gl_FragCoord.xy);

        // Base dithering (kept constant) before quantization.
        vec3 adjustedColor = color.rgb + (threshold - 0.5) * ditherFactor;
        
        // Clamp the adjusted color
        adjustedColor = clamp(adjustedColor, 0.0, 1.0);
        
        // Find the closest color in the palette for the adjusted color
        vec3 quantizedColor = findClosestColor(adjustedColor);

        // Palette-colored cursor trail: affects the entire pixel cell.
        quantizedColor = mix(quantizedColor, trailColor, trailStrength);

        // Apply edge highlighting (use palette color under trail instead of always white).
        vec3 effectiveEdgeColor = mix(edgeColor, trailColor, trailStrength);
        if (isEdge) {
            quantizedColor = mix(quantizedColor, effectiveEdgeColor, localEdgeIntensity);
        }

        gl_FragColor = vec4(quantizedColor, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);

if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(program));
    throw new Error('Failed to link program');
}

// Set up geometry
const positions = new Float32Array([
    -1, -1,
     1, -1,
    -1,  1,
     1,  1,
]);

const texCoords = new Float32Array([
    0, 1,
    1, 1,
    0, 0,
    1, 0,
]);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

const texCoordBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

//uniform locations
const positionLocation = gl.getAttribLocation(program, 'position');
const texCoordLocation = gl.getAttribLocation(program, 'texCoord');
const uTextureLocation = gl.getUniformLocation(program, 'uTexture');
const uTrailLocation = gl.getUniformLocation(program, 'uTrail');
const trailResolutionLocation = gl.getUniformLocation(program, 'trailResolution');
const trailScaleLocation = gl.getUniformLocation(program, 'trailScale');
const resolutionLocation = gl.getUniformLocation(program, 'resolution');
const pixelSizeLocation = gl.getUniformLocation(program, 'pixelSize');
const ditherFactorLocation = gl.getUniformLocation(program, 'ditherFactor');
const cursorDitherBoostLocation = gl.getUniformLocation(program, 'cursorDitherBoost');
const paletteChoiceLocation = gl.getUniformLocation(program, 'paletteChoice');
const edgeThresholdLocation = gl.getUniformLocation(program, 'edgeThreshold');
const edgeIntensityLocation = gl.getUniformLocation(program, 'edgeIntensity');
const edgeColorLocation = gl.getUniformLocation(program, 'edgeColor');
const timeLocation = gl.getUniformLocation(program, 'time');

const texture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, texture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
// Initialize with empty texture
gl.texImage2D(
    gl.TEXTURE_2D, 
    0, 
    gl.RGBA, 
    1, 
    1, 
    0, 
    gl.RGBA, 
    gl.UNSIGNED_BYTE, 
    new Uint8Array([0, 0, 0, 255])
);

// --- Cursor dither trail (mask texture) ---
const trailTexture = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, trailTexture);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([0, 0, 0, 0])
);

// Offscreen canvas for the trail mask (kept small for performance; aspect-correct).
const trailCanvas = document.createElement('canvas');
const trailCtx = trailCanvas.getContext('2d', { alpha: true });
let trailW = 256;
let trailH = 256;
let trailScaleX = 1.0;
let trailScaleY = 1.0;
let cursorActive = false;
let cursorNDC = { x: 0.5, y: 0.5 }; // normalized [0..1] within canvas
// Cursor motion tracking (to only show effect while moving, and scale by speed)
let lastCursorNDC = { x: 0.5, y: 0.5 };
let lastCursorTime = performance.now();
let cursorSpeed = 0; // normalized speed ~ 0..?
let lastMoveTime = 0;

function resizeTrailToCanvas(force = false) {
  // Match the active *pixel grid* so the effect snaps perfectly to the pixelation.
  // One trail texel == one pixel-block cell.
  const px = Math.max(1, Math.round(parseFloat(obj.pixelSize) || 1));
  const gridW = Math.max(1, Math.ceil(canvas.width / px));
  const gridH = Math.max(1, Math.ceil(canvas.height / px));

  // Clamp for performance (keeps GPU uploads cheap).
  const maxDim = 512;
  const nextW = Math.min(maxDim, gridW);
  const nextH = Math.min(maxDim, gridH);

  // If clamped, keep a mapping so shader sampling stays aligned.
  trailScaleX = nextW / gridW;
  trailScaleY = nextH / gridH;

  if (!force && nextW === trailW && nextH === trailH) return;

  trailW = nextW;
  trailH = nextH;
  trailCanvas.width = trailW;
  trailCanvas.height = trailH;

  // Clear any existing trail
  trailCtx.clearRect(0, 0, trailW, trailH);
}

// Stamp + decay each frame to create a small fading trail.
function updateTrailMask() {
  if (!trailCtx) return;

  // If pixelSize changed (or canvas resized), keep trail buffer aligned to the new grid.
  resizeTrailToCanvas(false);

  // Decay existing mask (destination-out reduces alpha).
  trailCtx.save();
  trailCtx.globalCompositeOperation = 'destination-out';
  // Slightly faster fade when not moving (so it disappears unless you're actively moving).
  const now = performance.now();
  const movingRecently = (now - lastMoveTime) < 120;
  trailCtx.fillStyle = movingRecently ? 'rgba(0, 0, 0, 0.015)' : 'rgba(0, 0, 0, 0.03)';
  trailCtx.fillRect(0, 0, trailW, trailH);
  trailCtx.restore();

  // Only stamp while moving (and scale stamp density with speed).
  if (cursorActive && movingRecently) {
    // Cursor position in *grid cells* (trail buffer is grid-aligned)
    const cx = Math.floor(cursorNDC.x * trailW);
    const cy = Math.floor(cursorNDC.y * trailH);

    // Normalize speed into 0..1 (tight clamp to prevent huge blooms)
    const s = Math.min(1, cursorSpeed * 0.55);

    // "Dristle" parameters (all in grid cells)
    const radius = 1 + Math.floor(2 * s);          // 1..3 cells
    const spray = 6 + Math.floor(26 * s);          // 6..32 cells per frame
    const along = 0.5 + 1.5 * s;                   // elongation along motion direction

    // Direction of motion (in grid space)
    const dirX = (cursorNDC.x - lastCursorNDC.x);
    const dirY = (cursorNDC.y - lastCursorNDC.y);
    const dirLen = Math.max(1e-5, Math.hypot(dirX, dirY));
    const ux = dirX / dirLen;
    const uy = dirY / dirLen;

    // Stamp: irregular scatter, binary (no half-transparent dots)
    // Stamp varying alpha so each pixel cell persists for a different duration (~0.2s..0.8s)
    // in combination with the global decay (see fillStyle above).

    for (let i = 0; i < spray; i++) {
      // Random angle + radius (biased toward center)
      const a = Math.random() * Math.PI * 2;
      const r = Math.random() * Math.random() * radius;

      // Add a small bias along movement direction to feel like a trail
      const bias = (Math.random() - 0.2) * along * radius;

      const ox = Math.round(Math.cos(a) * r + ux * bias);
      const oy = Math.round(Math.sin(a) * r + uy * bias);

      const x = cx + ox;
      const y = cy + oy;
      if (x < 0 || y < 0 || x >= trailW || y >= trailH) continue;

      // 80% of candidate pixels: do nothing (0% opacity)
    if (Math.random() > 0.05) continue;

    // 20%: stamp at full "visual" opacity, but store a mask alpha that controls lifetime
    // (higher alpha survives longer before it drops below the shader threshold)
    const alpha = 0.65 + Math.random() * 0.35; // tuned for ~0.2–0.8s with your decay
    trailCtx.fillStyle = `rgba(255,255,255,${alpha})`;
    trailCtx.fillRect(x, y, 1, 1);
    }
  }

  // Upload to WebGL
  gl.activeTexture(gl.TEXTURE1);
  gl.bindTexture(gl.TEXTURE_2D, trailTexture);
  try {
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, trailCanvas);
  } catch (e) {
    console.error('Error updating trail texture:', e);
  }
}

function updateCursorFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width;
  const y = (e.clientY - rect.top) / rect.height;

  const nx = Math.min(1, Math.max(0, x));
  // Web events are top-left origin; gl_FragCoord is bottom-left origin.
  // Flip Y so the trail lines up with what the shader sees.
  const ny = Math.min(1, Math.max(0, y));

  const now = performance.now();
  const dt = Math.max(1, now - lastCursorTime);

  // Speed in "normalized canvas units per second"
  const dx = nx - lastCursorNDC.x;
  const dy = ny - lastCursorNDC.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  cursorSpeed = (dist / dt) * 1000.0;

  if (dist > 0.0005) {
    lastMoveTime = now;
  }

  lastCursorNDC.x = nx;
  lastCursorNDC.y = ny;
  lastCursorTime = now;

  cursorNDC.x = nx;
  cursorNDC.y = ny;
}

canvas.addEventListener('mousemove', (e) => {
  cursorActive = true;
  updateCursorFromEvent(e);
});
canvas.addEventListener('mouseleave', () => {
  cursorActive = false;
});

// Mobile touch support
canvas.addEventListener('touchstart', (e) => {
  if (!e.touches || !e.touches.length) return;
  cursorActive = true;
  updateCursorFromEvent(e.touches[0]);
}, { passive: true });
canvas.addEventListener('touchmove', (e) => {
  if (!e.touches || !e.touches.length) return;
  cursorActive = true;
  updateCursorFromEvent(e.touches[0]);
}, { passive: true });
canvas.addEventListener('touchend', () => {
  cursorActive = false;
});

// Add initialization code
gl.clearColor(0.0, 0.0, 0.0, 1.0);
gl.enable(gl.DEPTH_TEST);

async function setupWebcam() {
  const video = document.createElement('video');

  if(isMobileFlag){
    video.setAttribute('playsinline', '');  // Required for iOS
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('autoplay', '');
    // video.style.transform = 'scaleX(-1)';  // Mirror the video
  }

  try {
      const constraints = {
          video: {
              width: { ideal: 1280 },
              height: { ideal: 720 }
          }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      
      // Wait for video to be ready
      await new Promise((resolve) => {
          video.onloadedmetadata = () => {
              video.play().then(() => resolve());
          };
      });
      
      // Set canvas size after video is ready
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      gl.viewport(0, 0, canvas.width, canvas.height);
      resizeTrailToCanvas();
      
      return video;
  } catch (err) {
      console.error('Error accessing camera:', err);
      throw err;
  }
}



function render() {
  drawScene();
  animationRequest = requestAnimationFrame(render);
}

function drawScene(){

  if (!currentVideo) return;

  // Update trail mask every frame (creates the subtle cursor trail)
  updateTrailMask();

  // Only upload video/image frame when it is ready.
  const ready = (typeof currentVideo.readyState === 'number') ? (currentVideo.readyState >= 2) : true;
  if (!ready) return;

  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  try {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, currentVideo);
  } catch (e) {
      console.error('Error updating texture:', e);
      return;
  }

  gl.useProgram(program);

  // Explicitly bind samplers
  gl.uniform1i(uTextureLocation, 0);
  gl.uniform1i(uTrailLocation, 1);

      // Set uniforms
      gl.uniform2f(trailResolutionLocation, trailW, trailH);
      gl.uniform2f(trailScaleLocation, trailScaleX, trailScaleY);
      gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
      gl.uniform1f(pixelSizeLocation, parseFloat(obj.pixelSize));
      gl.uniform1f(ditherFactorLocation, parseFloat(obj.ditherFactor));
      gl.uniform1f(cursorDitherBoostLocation, parseFloat(obj.cursorDitherBoost));
      gl.uniform1f(timeLocation, performance.now() * 0.001);
      gl.uniform1f(edgeThresholdLocation, parseFloat(obj.edgeThreshold));
      gl.uniform1f(edgeIntensityLocation, parseFloat(obj.edgeIntensity));
      // Convert edge color from 0-255 range to 0-1 range for WebGL
      gl.uniform3f(edgeColorLocation, 
          obj.edgeColor[0] / 255.0,
          obj.edgeColor[1] / 255.0,
          obj.edgeColor[2] / 255.0,
      );

      let paletteValue = paletteNames.indexOf(obj.colorPalette);
      gl.uniform1i(paletteChoiceLocation, paletteValue);

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.enableVertexAttribArray(positionLocation);
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

      gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
      gl.enableVertexAttribArray(texCoordLocation);
      gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// Handle video source cleanup
function cleanupVideoSource() {
  if (currentVideo) {
      currentVideo.pause();
      if (currentVideo.srcObject) {
          // Stop webcam stream
          const tracks = currentVideo.srcObject.getTracks();
          tracks.forEach(track => track.stop());
          currentVideo.srcObject = null;
      } else if (currentVideo.src) {
          // Clean up uploaded video (only revoke if it is actually a blob URL)
          if (typeof currentVideo.src === 'string' && currentVideo.src.startsWith('blob:')) {
              URL.revokeObjectURL(currentVideo.src);
          }
          currentVideo.src = '';
      }
      currentVideo = null;
  }
}

function useWebcam(){
  cleanupVideoSource();
  canvas.classList.remove('image-mode'); // Remove image mode
  setupWebcam().then(video => {
      currentVideo = video;
      animationPlayToggle = true;
      render();
  }).catch(err => {
      console.error('Failed to start webcam:', err);
  });
}

fileInput.addEventListener('change', (e) => {
  cleanupVideoSource();
  canvas.classList.remove('image-mode'); // Remove image mode
  if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      userVideo.src = url;
      userVideo.onloadedmetadata = () => {
          userVideo.width = userVideo.videoWidth;
          userVideo.height = userVideo.videoHeight;
          console.log("user video width/height: " + userVideo.width + ", " + userVideo.height);

          // Fit within a max width while preserving aspect ratio
          const canvasWidth = Math.min(userVideo.videoWidth, maxCanvasWidth);
          const canvasHeight = Math.floor(canvasWidth * (userVideo.videoHeight / userVideo.videoWidth));

          canvas.width = canvasWidth;
          canvas.height = canvasHeight;
          console.log("canvas width/height: " + canvas.width + ", " + canvas.height);

          gl.viewport(0, 0, canvas.width, canvas.height);
          resizeTrailToCanvas();

          // Start playback and rendering as soon as possible
          userVideo.play().then(() => {
              currentVideo = userVideo;
              animationPlayToggle = true;
              render();
          }).catch((err) => {
              console.error('Error playing uploaded video:', err);
          });
      };
  }
});

// ADD THIS NEW CODE HERE - Image upload handler
const imageInput = document.getElementById('imageInput');
const userImage = document.getElementById('userImage');

imageInput.addEventListener('change', (e) => {
    cleanupVideoSource();
    if (e.target.files && e.target.files[0]) {
        const file = e.target.files[0];
        const url = URL.createObjectURL(file);
        
        userImage.onload = function() {
            // Add image mode class
            canvas.classList.add('image-mode');
            
            // Calculate aspect ratios
            const imageAspect = userImage.naturalWidth / userImage.naturalHeight;
            const viewportAspect = window.innerWidth / window.innerHeight;
            
            let canvasWidth, canvasHeight;
            
            // Fill viewport while maintaining aspect ratio
            if (imageAspect > viewportAspect) {
                // Image is wider - fit to width
                canvasWidth = window.innerWidth;
                canvasHeight = window.innerWidth / imageAspect;
            } else {
                // Image is taller - fit to height
                canvasHeight = window.innerHeight;
                canvasWidth = window.innerHeight * imageAspect;
            }
            
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            gl.viewport(0, 0, canvas.width, canvas.height);
            resizeTrailToCanvas();
            
            // Create a video element to hold the static image
            const staticVideo = document.createElement('video');
            staticVideo.width = userImage.naturalWidth;
            staticVideo.height = userImage.naturalHeight;
            staticVideo.muted = true;
            staticVideo.loop = true;
            staticVideo.setAttribute('playsinline', '');
            
            // Create canvas to draw image
            const imageCanvas = document.createElement('canvas');
            imageCanvas.width = userImage.naturalWidth;
            imageCanvas.height = userImage.naturalHeight;
            const ctx = imageCanvas.getContext('2d');
            ctx.drawImage(userImage, 0, 0);
            
            // Convert canvas to video stream
            const stream = imageCanvas.captureStream(1);
            staticVideo.srcObject = stream;
            staticVideo.play();
            
            currentVideo = staticVideo;
            
            // Start rendering
            if(animationPlayToggle == false) {
                animationPlayToggle = true;
                render();
            }
        };
        
        userImage.src = url;
    }
});

function startDefaultVideo(){
  if(animationPlayToggle==true){
      cancelAnimationFrame(animationRequest);
      console.log("cancel animation");
  }

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  defaultVideo.play();

  gl.viewport(0, 0, canvas.width, canvas.height);
  resizeTrailToCanvas();
  animationPlayToggle = true;

  currentVideo = defaultVideo;
  render();
}

function toggleAnimationPlay(){
  if(animationPlayToggle){
    currentVideo.pause();
    cancelAnimationFrame(animationRequest);
  } else {
    currentVideo.play();
    // animationRequest = render(currentVideo);
    render();
  }
  animationPlayToggle = !animationPlayToggle;
}

function toggleGUI(){
  if(guiOpenToggle == false){
      gui.open();
      guiOpenToggle = true;
  } else {
      gui.close();
      guiOpenToggle = false;
  }
}
  
//shortcut hotkey presses
document.addEventListener('keydown', function(event) {
  
  if (event.key === 's') {
      saveImage();
  } else if (event.key === 'v') {
      toggleVideoRecord();
  } else if (event.key === 'o') {
      toggleGUI();
  } else if (event.key === 'p') {
    toggleAnimationPlay();
  } else if(event.key === 'r'){
    randomizeInputs();
  }
  
});

function randomizeInputs(){
  obj.pixelSize = Math.ceil(Math.pow(Math.random(),4)*32);
  obj.ditherFactor = Math.pow(Math.random(),2);
  obj.colorPalette = paletteNames[Math.round(Math.random()*(paletteNames.length-1))];
  obj.edgeThreshold = Math.random() * 0.49 + 0.01;
  obj.edgeIntensity = Math.random();

  // Generate random RGB color for edges
  obj.edgeColor = [
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256),
      Math.floor(Math.random() * 256)
  ];
}

// Keep the trail mask aspect-correct if the canvas size changes.
// (We only resize the main canvas for default video + image mode; uploaded video/webcam keep their native sizes.)
window.addEventListener('resize', () => {
  if (canvas.classList.contains('image-mode') && userImage && userImage.naturalWidth) {
    const imageAspect = userImage.naturalWidth / userImage.naturalHeight;
    const viewportAspect = window.innerWidth / window.innerHeight;
    let canvasWidth, canvasHeight;
    if (imageAspect > viewportAspect) {
      canvasWidth = window.innerWidth;
      canvasHeight = window.innerWidth / imageAspect;
    } else {
      canvasHeight = window.innerHeight;
      canvasWidth = window.innerHeight * imageAspect;
    }
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    resizeTrailToCanvas();
  } else if (currentVideo === defaultVideo) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    resizeTrailToCanvas();
  }
});

setTimeout(function() {
    startDefaultVideo();
}, 100);