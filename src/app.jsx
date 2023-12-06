import { render } from 'preact'
import { useState, useEffect } from 'preact/hooks'
//import './app.css'
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
    const light = new THREE.HemisphereLight(0xffffff, 0x444444);
    light.position.set(0, 20, 0);
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
        console.log(carModel.children[0]);
        // Remove loading text when model is loaded
        document.getElementById('loading-text').style.display = 'none';
        // recursively log each of the car model's children
        let childrenArray = [];
        carModel.traverse((child) => {
          childrenArray.push(child.name);
        })
        console.log("Layers/meshes:", childrenArray);
        // changeLayerColor function
        function changeLayerColor(mesh, color) {
          carModel.traverse((child) => {
            if (child.name === mesh) {
              child.material.color.setHex(color);
              console.info("Mesh", mesh, "color changed to", color);
            }
          })
        }
        document.addEventListener('colorChange', (event) => {
          changeLayerColor('Mesh_body014', event.detail.color);
        })
        // color tests
        changeLayerColor('Mesh_body014', 0x0000ff);
        // convert hex to rgb
        changeLayerColor('Mesh_body014', 0x00ff00);
        changeLayerColor('Mesh_body014_1', 0x00ff00);
        changeLayerColor('Mesh_wheel_frontLeft011_2', 0xff00ff);
        //changeLayerColor('Mesh_wheel_frontLeft030', 0xff00ff);

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

    // DEBUG: on keydown P
    document.addEventListener('keydown', (event) => {
      if (event.key == 'p') {
        console.log("camera rotation", controls)
      }
    })

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
            <h3>Body Color</h3>
            <ul>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange', {
                  detail: {
                    color: 0xff0000
                  }
                }));
              }}>Red</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange', {
                  detail: {
                    color: 0x00ff00
                  }
                }));
              }}>Green</button>
              <button className="wheel-option" onClick={() => {
                // create an event
                document.dispatchEvent(new CustomEvent('colorChange', {
                  detail: {
                    color: 0x0000ff
                  }
                }));
              }}>Blue</button>
            </ul>
          </div>
          <div className="controls-option">
            <h3>Wheels</h3>
            <ul>
              <button className="wheel-option">Option 1</button>
              <button className="wheel-option">Option 2</button>
              <button className="wheel-option">Option 3</button>
            </ul>
          </div>
        </ul>
      </div>
    </>
  )
}

render(<App />, document.getElementById('app'))