import { SogLoader } from '3dgs-loader'
import { SplatWorker, SplatMesh } from '@dvt3d/splat-mesh'
const sogLoader = new SogLoader({
  workerLimit: 1,
  workerBaseUrl: 'https://cdn.jsdelivr.net/npm/3dgs-loader@1.2.0/dist/',
  wasmBaseUrl: 'https://cdn.jsdelivr.net/npm/3dgs-loader@1.2.0/dist/wasm/',
})
const data = await sogLoader.loadAsSplat('http://localhost:8080/ggy.sog')
const splatWorker = new SplatWorker('../workers/wasm_splat.worker.min.js')
const splatMesh = new SplatMesh()
splatMesh.threshold = -0.000001
splatMesh.attachWorker(splatWorker)
splatMesh.setVertexCount(data.numSplats)
await splatMesh.setDataFromBuffer(data.buffer)
splatMesh.rotation.x = -Math.PI
world.add(splatMesh)
