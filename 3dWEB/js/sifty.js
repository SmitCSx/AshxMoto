import * as THREE from 'https://esm.sh/three@0.159.0';
import { GLTFLoader } from 'https://esm.sh/three@0.159.0/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'https://esm.sh/three@0.159.0/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'https://esm.sh/lil-gui@0.18.0';

let scene, camera, renderer, controls;
let model;
let rotate = false;
let light;
let gui;
let mixer, animationAction;

let clock = new THREE.Clock();

let modelName = null;
let animationPlaying = false;
let animationCameraActive = false;
let animatedCamera = null;

window.addEventListener('DOMContentLoaded', () => {
  modelName = document.body.dataset.model || 'nix';
  console.log("Loading model:", modelName);
  init();
  animate();
  loadModel();
});

function init() {
  scene = new THREE.Scene();
   const room = new THREE.Mesh(
    new THREE.BoxGeometry(100, 100, 100),
    new THREE.MeshStandardMaterial({ color: 0x111111, side: THREE.BackSide })
  );
  scene.add(room);
  camera = new THREE.PerspectiveCamera(100, window.innerWidth / (window.innerHeight * 0.7), 0.1, 1000);
  camera.position.set(22.54, 1.05, 21.86);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight * 0.7);
  renderer.setClearColor("#857a7a");
  document.getElementById("viewer").appendChild(renderer.domElement);

  controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 1, 0);
  controls.update();

  const keyLight = new THREE.DirectionalLight(0xffffff, 1.5);
  keyLight.position.set(5, 10, 5);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 1.0);
  fillLight.position.set(-5, 5, -5);
  scene.add(fillLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.8);
  backLight.position.set(0, 10, -10);
  scene.add(backLight);

  const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
  scene.add(ambientLight);

  light = new THREE.SpotLight(0xffffff);
  light.position.set(10, 20, 10);
  light.angle = 0.3;
  light.penumbra = 0.1;
  light.castShadow = true;
  scene.add(light);

  gui = new GUI();
  const spotFolder = gui.addFolder('Spot');
  spotFolder.add(light, 'visible').name('Enable');
  spotFolder.addColor(light, 'color');
  spotFolder.add(light, 'distance', 0, 100);
  spotFolder.add(light, 'angle', 0, 1.57);
  spotFolder.add(light, 'penumbra', 0, 1);
  spotFolder.open();

  const bgParams = { color: "#857a7a" };
  gui.addColor(bgParams, "color").name("Background").onChange(value => {
    renderer.setClearColor(value);
  });

  window.addEventListener("resize", onWindowResize);
}

function loadModel() {
  const loader = new GLTFLoader();
  loader.load(`${modelName}.glb`, function (gltf) {
    model = gltf.scene;
    scene.add(model);
    document.getElementById("loading-spinner").style.display = "none";

    gltf.scene.traverse((child) => {
      if (child.isCamera) {
        animatedCamera = child;
      }
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;

        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach(mat => {
          if (!mat.isMeshStandardMaterial) {
            mat = new THREE.MeshStandardMaterial({
              color: mat.color || 0xffffff,
              roughness: 0.4,
              metalness: 0.2
            });
          }
        });
      }
    });

    if (gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(gltf.scene);
      animationAction = mixer.clipAction(gltf.animations[0]);
      animationAction.clampWhenFinished = true;
      animationAction.loop = THREE.LoopOnce;

      animationAction.onFinished = () => {
        animationPlaying = false;
        animationCameraActive = false;
        camera = controls.object;
        controls.enabled = true;

        const msg = document.createElement('div');
        msg.id = 'anim-complete-msg';
        msg.textContent = 'Animation Finished!';
        msg.style = `
          position: absolute;
          top: 20px;
          right: 20px;
          background: rgba(0,0,0,0.8);
          color: #fff;
          padding: 12px 20px;
          border-radius: 8px;
          font-size: 16px;
          z-index: 999;
        `;
        document.body.appendChild(msg);
        setTimeout(() => msg.remove(), 5000);
      };
    }
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / (window.innerHeight * 0.7);
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight * 0.7);
}

function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  if (mixer) mixer.update(delta);
  if (rotate && model) model.rotation.y += 0.01;
  renderer.render(scene, camera);
}

window.openModel = function () {
  camera.position.set(22.54, 1.05, 21.86);
  controls.target.set(0, 1, 0);
  controls.update();
};

window.toggleWireframe = function () {
  if (!model) return;
  model.traverse(obj => {
    if (obj.isMesh && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach(mat => {
        if ('wireframe' in mat) mat.wireframe = !mat.wireframe;
      });
    }
  });
};

window.toggleRotation = function () {
  rotate = !rotate;

 
};


window.playAnimation = function () {
  if (!animationAction) return;

  
  camera.position.set(10, 5, 15); 
  controls.target.set(0, 1, 0);   
  controls.update();

  
  controls.enabled = false;

  
  animationAction.reset().play();
  animationPlaying = true;

  
  if (animatedCamera && !animationCameraActive) {
    camera = animatedCamera;
    animationCameraActive = true;
  }
};


window.toggleAnimation = function () {
  const btn = document.getElementById("animBtn");

  if (!animationAction) return;

  if (!animationPlaying) {
    animationAction.reset().play();
    animationPlaying = true;
    btn.textContent = "Stop Animation";

    if (animatedCamera && !animationCameraActive) {
      camera = animatedCamera;
      controls.enabled = false;
      animationCameraActive = true;
    }
  } else {
    animationAction.stop();
    animationPlaying = false;
    btn.textContent = "Check it out!!!";

    if (animatedCamera && animationCameraActive) {
      camera = controls.object;
      controls.enabled = true;
      animationCameraActive = false;
    }
  }
};

window.goToNextModel = function () {
  const modelSequence = ["nix", "oldman", "sifty"];
  const currentModel = document.body.dataset.model;
  const currentIndex = modelSequence.indexOf(currentModel);
  const nextIndex = (currentIndex + 1) % modelSequence.length;
  const nextModel = modelSequence[nextIndex];
  window.location.href = `${nextModel}.html`;
};
