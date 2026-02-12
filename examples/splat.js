import { SplatLoader } from '3dgs-loader'
import { SplatWorker, SplatMesh } from '@dvt3d/splat-mesh'
const splatLoader = new SplatLoader({
  workerLimit: 1,
  workerBaseUrl: 'https://cdn.jsdelivr.net/npm/3dgs-loader@1.2.0/dist/',
})
const data = await splatLoader.load('http://localhost:8080/ggy.splat')
const splatWorker = new SplatWorker('../workers/wasm_splat.worker.min.js')
let splatMesh = new SplatMesh()
splatMesh.threshold = -0.000001
splatMesh.attachWorker(splatWorker)
splatMesh.setVertexCount(data.numSplats)
await splatMesh.setDataFromBuffer(data.buffer)
splatMesh.rotation.x = -Math.PI
world.add(splatMesh)
