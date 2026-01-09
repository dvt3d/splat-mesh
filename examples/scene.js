import * as THREE from 'three'
import { OrbitControls } from 'three/addons'

const container = document.getElementById('scene-container')

const scene = new THREE.Scene()
scene.background = new THREE.Color(0, 0, 0)
const world = new THREE.Group()
world.name = 'world'
scene.add(world)
const camera = new THREE.PerspectiveCamera(
  60,
  container.clientWidth / container.clientHeight,
  0.001,
  1e10,
)
camera.position.set(0, 0, 1)
const renderer = new THREE.WebGLRenderer({
  alpha: true,
  antialias: true,
})
renderer.setSize(container.clientWidth, container.clientHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
container.appendChild(renderer.domElement)
container.minDistance = 0
container.maxDistance = Infinity
container.enableDamping = false
const controls = new OrbitControls(camera, renderer.domElement)
const gridHelper = new THREE.GridHelper(1000, 10)
gridHelper.position.set(0, 0, 0)
world.add(gridHelper)
const clock = new THREE.Clock()

window.addEventListener('resize', () => {
  camera.aspect = container.clientWidth / container.clientHeight
  renderer.setSize(container.clientWidth, container.clientHeight)
})

function animate() {
  requestAnimationFrame(animate.bind(this))
  controls.update()
  renderer.render(scene, camera)
}

animate()

window.world = world
