loader.load('/models/car.gltf',
(gltf) => {
  var carModel = gltf.scene;
  // Adjust the scale as needed
  carModel.scale.set(2, 2, 2);
  carModel.position.y = -2;
  scene.add(carModel);
  //carModel = scene;
  console.log("Car Model", carModel);
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
  async function changeLayerColor(mesh, color) {
    carModel.traverse((child) => {
      if (child.name === mesh) {
        child.material.color.setHex(color);
        console.info("Mesh", mesh, "color changed to", color);
      };
    });
  };

  // Listen for UI events
  document.addEventListener('colorChange-body1', (event) => {
    changeLayerColor('Mesh_body014', event.detail.color);
  });
  document.addEventListener('colorChange-body2', (event) => {
    changeLayerColor('Mesh_body014_1', event.detail.color);
  });
  document.addEventListener('materialSwap-body1', (event) => {
    swapLayerMaterial('Mesh_body014', materialBank[event.detail.name]);
  });
  document.addEventListener('materialSwap-body2', (event) => {
    swapLayerMaterial('Mesh_body014_1', materialBank[event.detail.name]);
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
  document.addEventListener('materialSwap-windshield', (event) => {
    swapLayerMaterial('Mesh_body014_2', materialBank[event.detail.name]);
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
  });
}, 
(xhr) => {
  console.info('GLTF Model loaded', (xhr.loaded / xhr.total * 100) + '%');
  setTimeout(() => {
    // Remove loading text when model is loaded
    document.getElementById('loading-text').style.display = 'none';
  }, 500);
},
(error) => {
  console.error(error);
});