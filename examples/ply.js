import { PlyLoader } from '3dgs-loader'
import { SplatWorker, SplatMesh } from '@dvt3d/splat-mesh'
const plyLoader = new PlyLoader({
  workerLimit: 1,
  workerBaseUrl: 'https://cdn.jsdelivr.net/npm/3dgs-loader@1.2.0/dist/',
})
const data = await plyLoader.loadAsSplat('http://localhost:8080/ggy.ply')
const splatWorker = new SplatWorker('../workers/wasm_splat.worker.min.js')
let splatMesh = new SplatMesh()
splatMesh.attachWorker(splatWorker)
splatMesh.setVertexCount(data.numSplats)
await splatMesh.setDataFromBuffer(data.buffer)
splatMesh.rotation.x = -Math.PI
world.add(splatMesh)
