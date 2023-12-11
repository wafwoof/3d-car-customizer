import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
import { SpeedInsights } from "@vercel/speed-insights/react"
import './app.css'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import TWEEN from '@tweenjs/tween.js'

export function App() {
  useEffect(() => {
    // bootstrap three.js scene
    var HEIGHT = window.innerHeight - 350;
    var WIDTH = window.innerWidth;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(85, WIDTH / HEIGHT, 0.1, 1000);
    const canvas = document.getElementById('canvas');
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
    renderer.setSize(window.innerWidth, HEIGHT);
    window.addEventListener('resize', () => {
      // recalculate HEIGHT and WIDTH on window resize
      HEIGHT = window.innerHeight - 350;
      WIDTH = window.innerWidth;
      renderer.setSize(WIDTH, HEIGHT);
      camera.aspect = WIDTH / HEIGHT;
      camera.updateProjectionMatrix();
    });
    // set background color white
    renderer.setClearColor(0xffffff, 1);
    // add light to scene
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const light = new THREE.DirectionalLight(0xffffff, 0x444444);
    // increase light intensity
    light.intensity = 5;
    light.castShadow = true;
    light.position.set(10, 20, 3);
    scene.add(light);
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
    // load the car model from the preloaded gltf file
    // https://kaz-test-bucket.s3.amazonaws.com/models/car.gltf
    loader.load('/models/car.gltf',
      (gltf) => {
        const carModel = gltf.scene;
        // Adjust the scale as needed
        carModel.scale.set(2, 2, 2);
        carModel.position.y = -2;
        scene.add(carModel);
        console.log("Car Model", carModel.children[0].children[0]);
        // recursively log each of the car model's children
        let childrenArray = [];
        carModel.traverse((child) => {
          childrenArray.push(child.name);
        })
        // do the same for each of the models materials and log their names
        let materialsArray = [];
        carModel.traverse((child) => {
          if (child.material) {
            materialsArray.push(child.material.name);
          }
        })
        console.log("Children", childrenArray);
        console.log("Materials", materialsArray);
        // changeLayerColor function
        function changeLayerColor(mesh, color) {
          carModel.traverse((child) => {
            if (child.name === mesh) {
              try {
                child.material.emissive.setHex(color);
              } catch (error) {
                child.material.color.setHex(color);
              }
              console.info("Mesh", mesh, "color changed to", color);
            }
          })
        }
        // color tests
        //changeLayerColor('Mesh_wheel_frontLeft030', 0x00ffff);
        // Listen for UI events
        document.addEventListener('colorChange-body1', (event) => {
          changeLayerColor('Mesh_body014', event.detail.color);
        });
        document.addEventListener('colorChange-body2', (event) => {
          changeLayerColor('Mesh_body014_1', event.detail.color);
        });
        document.addEventListener('colorChange-wheel1', (event) => {
          changeLayerColor('Mesh_wheel_frontLeft028', event.detail.color);
        });
        document.addEventListener('colorChange-wheel2', (event) => {
          changeLayerColor('Mesh_wheel_frontLeft028_2', event.detail.color);
        });
        document.addEventListener('colorChange-windshield', (event) => {
          changeLayerColor('Mesh_body014_2', event.detail.color);
        });
        // test smooth camera pan
        moveCameraToPosition(4, -0.2, 5);
        // hookeup wasd controls
        document.addEventListener('keydown', (event) => {
          if (event.key == '1') {
            moveCameraToPosition(0, 0, 5);
            console.info("Moving to position 1:", camera.position.x, camera.position.y, camera.position.z);
          }
          if (event.key == '2') {
            moveCameraToPosition(4, -0, 5); 
            console.info("Moving to position 2:", camera.position.x, camera.position.y, camera.position.z);
          }
          if (event.key == '3') {
            moveCameraToPosition(4, -0, -0.5); 
            console.info("Moving to position 3:", camera.position.x, camera.position.y, camera.position.z);
          }
          if (event.key == '4') {
            moveCameraToPosition(4, -1, -0.5);
            console.info("Moving to position 4:", camera.position.x, camera.position.y, camera.position.z);
          }
        })
      }, 
      (xhr) => {
        console.log('GLTF Model loaded', (xhr.loaded / xhr.total * 100) + '%');
        setTimeout(() => {
          // Remove loading text when model is loaded
          document.getElementById('loading-text').style.display = 'none';
        }, 500);
      },
      (error) => {
        console.error(error);
      });

    // move camera back and up
    camera.position.z = 5;
    // add orbit controls and render scene
    const controls = new OrbitControls(camera, renderer.domElement); 
    // lock controls to x axis
    controls.minPolarAngle = Math.PI / 2;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enablePan = false;
    // lock distance from center
    controls.minDistance = 4;
    controls.maxDistance = 8;
    controls.update();
    console.log("Controls", controls)
    // function smoothly move camera to new position
    function moveCameraToPosition(x, y, z) {
      new TWEEN.Tween(camera.position)
        .to({ x, y, z }, 1000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .start();
    }

    // render scene
    const animate = function () {
      requestAnimationFrame(animate);
      TWEEN.update();
      camera.lookAt(scene.position);
      renderer.render(scene, camera);
    };
    animate();
  }, [])

  return (
    <>
      <h1>3d Car Customizer Demo</h1>
      <h2 id="loading-text">Loading...</h2>
      <div id="customizer">
        <canvas id="canvas"></canvas>
        <ul id="controls">
          <div className="controls-option">
            <h3>Body Color Primary</h3>
            <ul>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body1', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body1', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body1', {
                  detail: {
                    color: 0x0000ff
                  }
                }));
              }}>Blue</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Body Color Secondary</h3>
            <ul>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body2', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-body2', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button className="wheel-option" onClick={() => {
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
            <h3>Wheel Tire Color</h3>
            <ul>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel1', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel1', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel1', {
                  detail: {
                    color: 0x0000ff
                  }
                }));
              }}>Blue</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Wheel Rim Color</h3>
            <ul>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel2', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-wheel2', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button className="wheel-option" onClick={() => {
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
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-windshield', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-windshield', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange-windshield', {
                  detail: {
                    color: 0x0000ff
                  }
                }));
              }}>Blue</button>
            </ul>
          </div>
        </ul>
      </div>
      <section className="readme">
        <h2>Readme</h2>
        <p>3D Car Customizer Demo</p>
        <p>By Kazei McQuaid</p>
        <span>
          Don't worry if this doesn't get used for anything.
          Very rough draft.
        </span>
        <h2>Features</h2>
        <p>- Scroll to zoom in and out</p>
        <p>- Click and drag to rotate camera</p>
        <p>- 1, 2, 3, 4 Keys will change to preset camera-angles</p>
        <p>- Scrollable Customizaiton Menu</p>
        <p>- Ultra Realistic Skybox & Car Model</p>
      </section>
    </>
  )
}

render(<App />, document.getElementById('app'))