import { render } from 'preact';
import { useEffect } from 'preact/hooks';
import { SpeedInsights } from "@vercel/speed-insights/react"
import './app.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import TWEEN from '@tweenjs/tween.js';

export function App() {

  useEffect(() => {
    // BEGIN SETTING UP THREE.JS SCENE/CANVAS
    const scene = new THREE.Scene();
    const canvas = document.getElementById('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, }); // WebGLRenderer
    renderer.setClearColor(0xffffff, 1); // Background Color White
    renderer.setPixelRatio(window.devicePixelRatio); // fix pixel ratio
    const WIDTH = canvas.clientWidth;
    const HEIGHT = canvas.clientHeight;
    const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 1000);
    // Canvas reszing function
    function resizeCanvasToDisplaySize() {
      let width = canvas.clientWidth;
      let height = canvas.clientHeight;
      // adjust displayBuffer size to match
      if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        // you must pass false here or three.js sadly fights the browser
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        // update any render target sizes here
      };
    };
    // add light to scene
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 1);
    hemiLight.position.set(0, 300, 0);
    scene.add(hemiLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(35, 300, -75);
    scene.add(directionalLight);

    // add a blue gradient skybox to the scene
    const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
    const skyboxMaterial = new THREE.MeshBasicMaterial({ color: 0x88ccff, side: THREE.BackSide });
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
    scene.add(skybox);
    // add a floor to the scene
    const floorGeometry = new THREE.PlaneGeometry(1000, 1000, 1, 1);
    const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xc1cad5, side: THREE.DoubleSide });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = Math.PI / 2;
    floor.position.y = -2;
    scene.add(floor);

    // add gltf car model to scene with draco loader
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('https://www.gstatic.com/draco/versioned/decoders/1.5.6/');
    loader.setDRACOLoader(dracoLoader);
    const mixer = new THREE.AnimationMixer(scene);
    // load the car model from the preloaded gltf file
    // https://kaz-test-bucket.s3.amazonaws.com/models/car.gltf
    loader.load('/models/Benz_sls.glb',
        (gltf) => {
          var carModel = gltf.scene;
          // Adjust the scale as needed
          carModel.scale.set(2.5, 2.5, 2.5);
          carModel.position.y = -2;
          scene.add(carModel);
          setTimeout(() => { document.getElementById('loading-text').style.display = 'none'; }, 100);
          console.log("Car Model", carModel);
          // Testing Animation
          try {
            var anim_rim_spin = mixer.clipAction( gltf.animations[ 0 ] );
            console.log("Animation", anim_rim_spin);
            anim_rim_spin.play();
          } catch (error) {
            console.error(`(Animation error, model probably doesn't contain any)\n${error.message}`);
          }
          // SCENE MODEL CUSTOMIZATION FUNCTIONS
          // storeModelMaterials() function
          function storeModelMaterials() {
            let completedMaterials = [];
            let materialBank = {};
            carModel.traverse((child) => {
              if ('material' in child) {
                if (!completedMaterials.includes(child['material']['name'])) {
                  materialBank[child['material']['name']] = child['material'];
                  completedMaterials.push(child['material']['name']);
                };
              };
            });
            console.log(`Loaded (${completedMaterials.length}) Materials from Parent:`, completedMaterials);
            return materialBank;
          };
          const materialBank = storeModelMaterials();
          console.log("Material Bank", materialBank);
          // swapLayerMaterial() function
          function swapLayerMaterial(mesh, material) {
            carModel.traverse((child) => {
              if (child.name === mesh) {
                child.material = material.clone();
              };
            });
            console.info(mesh, "material swapped to", material.name);
          };
          // changeLayerColor function
          function changeLayerColor(mesh, color) {
            carModel.traverse((child) => {
              if (child.name === mesh) {
                child.material.color.setHex(color);
                console.info("Mesh", mesh, "color changed to", color);
              };
            });
          };

          // Listen for UI events
          document.addEventListener('colorChange-body1', (event) => {
            changeLayerColor('DesireFXME_Body_main', event.detail.color);
            changeLayerColor('DesireFXME_Front_bumper', event.detail.color);
          });
          document.addEventListener('colorChange-body2', (event) => {
            changeLayerColor('DesireFXME_Doors', event.detail.color);
          });
          document.addEventListener('materialSwap-body1', (event) => {
            swapLayerMaterial('DesireFXME_Body_main', materialBank[event.detail.name]);
            swapLayerMaterial('DesireFXME_Front_bumper', materialBank[event.detail.name]);
          });
          document.addEventListener('materialSwap-body2', (event) => {
            swapLayerMaterial('DesireFXME_Doors', materialBank[event.detail.name]);
          });
          document.addEventListener('colorChange-wheel1', (event) => {
            changeLayerColor('DesireFXME_Tire', event.detail.color);
          });
          document.addEventListener('colorChange-wheel2', (event) => {
            changeLayerColor('DesireFXME_wheel_rim04', event.detail.color);
          });
          document.addEventListener('colorChange-windshield', (event) => {
            changeLayerColor('Mesh_body014_2', event.detail.color);
          });
          document.addEventListener('materialSwap-windshield', (event) => {
            swapLayerMaterial('Mesh_body014_2', materialBank[event.detail.name]);
          });
          // startup smooth camera movement
          moveCameraToPosition(0, 2, 15);
          // hookeup wasd controls
          document.addEventListener('keydown', (event) => {
            if (event.key == '1') {
              moveCameraToPosition(4, -0.2, 10);
              console.info("Moving to position 1:", camera.position.x, camera.position.y, camera.position.z);
            }
            if (event.key == '2') {
              moveCameraToPosition(10, -0, 8); 
              console.info("Moving to position 2:", camera.position.x, camera.position.y, camera.position.z);
            }
            if (event.key == '3') {
              moveCameraToPosition(10, -0, -0.5); 
              console.info("Moving to position 3:", camera.position.x, camera.position.y, camera.position.z);
            }
            if (event.key == '4') {
              moveCameraToPosition(10, 5, -0.5);
              console.info("Moving to position 4:", camera.position.x, camera.position.y, camera.position.z);
            }
          });
        }, 
        (xhr) => {
          //console.info('GLTF Model loaded', (xhr.loaded / xhr.total * 100) + '%');
        },
        (error) => {
          console.error(error);
        });

    // Configure camera and controls
    camera.position.z = 5;
    const controls = new OrbitControls(camera, renderer.domElement); 
    // Limit Max-Polar-Angle to prevent going through the floor
    controls.maxPolarAngle = Math.PI / 2 - 0.1;

    controls.enablePan = false;
    // Lock distance from center
    controls.minDistance = 10;
    controls.maxDistance = 15;
    controls.update();
    //console.log("Controls", controls)
    // function smoothly move camera to new position
    function moveCameraToPosition(x, y, z) {
      new TWEEN.Tween(camera.position)
        .to({ x, y, z }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    }

    // Press R to rotate camera
    let rotationSpeed = 0.000;
    document.addEventListener('keydown', (event) => {
      if (event.key == 'r' && rotationSpeed == 0.000) {
        rotationSpeed = 0.001;
      }
      else if (event.key == 'r' && rotationSpeed == 0.001) {
        rotationSpeed = 0.000;
      }
    })

    // render scene loop 
    const animate = function () {
      requestAnimationFrame(animate);

      resizeCanvasToDisplaySize();
      TWEEN.update();

      // animation mixer
      if (mixer) {
        mixer.update(0.01);
      }

      scene.rotation.y += rotationSpeed; // Lazy Susan
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    };
    animate();
  }, [])

  return (
    <>
      <h1>(demonstration purposes only)</h1>
      <h2 id="loading-text">Loading...</h2>
      <div id="customizer">
        <canvas id="canvas" ></canvas>
        <ul id="controls">
          <div className="controls-option">
            <h3>Body Color Primary</h3>
            <ul>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body1', {
                  detail: {
                    color: 0xaa0000
                  }
                }));
              }}>Red</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body1', {
                  detail: {
                    color: 0x00aa00
                  }
                }));
              }}>Green</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body1', {
                  detail: {
                    color: 0x0000aa
                  }
                }));
              }}>Blue</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Body Material Primary</h3>
            <ul>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('materialSwap-body1', {
                  detail: {
                    name: 'Mercedes-Benz_SLS-class_2011_carpaint'
                  }
                }));
              }}>Mercedes Glossy Coat</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('materialSwap-body1', {
                  detail: {
                    name: 'Mercedes-Benz_SLS-class_2011_black'
                  }
                }));
              }}>Mercedes Matte Black</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Body Color Secondary</h3>
            <ul>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body2', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body2', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body2', {
                  detail: {
                    color: 0x0000ff
                  }
                }));
              }}>Blue</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Body Material Secondary</h3>
            <ul>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('materialSwap-body2', {
                  detail: {
                    name: 'Mercedes-Benz_SLS-class_2011_carpaint'
                  }
                }));
              }}>Mercedes Glossy Coat</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('materialSwap-body2', {
                  detail: {
                    name: 'Mercedes-Benz_SLS-class_2011_black'
                  }
                }));
              }}>Mercedes Matte Black</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Wheel Tire Color</h3>
            <ul>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel1', {
                  detail: {
                    color: 0x555555
                  }
                }));
              }}>Black</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel1', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel1', {
                  detail: {
                    color: 0xffffff
                  }
                }));
              }}>White</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Wheel Rim Color</h3>
            <ul>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel2', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel2', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel2', {
                  detail: {
                    color: 0x0000ff
                  }
                }));
              }}>Blue</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Windshield Color</h3>
            <ul>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-windshield', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-windshield', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-windshield', {
                  detail: {
                    color: 0x0000ff
                  }
                }));
              }}>Blue</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Windshield Material</h3>
            <ul>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('materialSwap-windshield', {
                  detail: {
                    name: 'window'
                  }
                }));
              }}>Window Glass</button>
              <button onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('materialSwap-windshield', {
                  detail: {
                    name: 'plastic'
                  }
                }));
              }}>PVC Model Plastic</button>
            </ul>
          </div>
        </ul>
      </div>
      <section id="readme">
        <section className="text-area">
          <h2>3D GLTF Customizer</h2>
          <p>Version: 0.0.5</p>
          <p>Built By: Kazei McQuaid</p>
          <p>Purpose: 3D Car Customizer is a React-compatible Model viewer/customizer Component.</p>
          <h2>Features</h2>
          <ul>
            <li>- 1, 2, 3, 4 keys to move camera to preset angles.</li>
            <li>- Press the R key to put the 3D Model on a lazy susan (rotation).</li>
            <li>- Click, Drag, and Scoll/Pinch to rotate and zoom camera.</li>
            <li>- Dynamic Canvas resizing.</li>
            <li>- Material Swapping & Cloning.</li>
          </ul>
        </section>
      </section>
      <SpeedInsights/>
    </>
  )
}

render(<App />, document.getElementById('app'))