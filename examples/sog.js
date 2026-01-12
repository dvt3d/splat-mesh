import { SogLoader } from '3dgs-loader'
import { SplatWorker, SplatMesh } from '@dvt3d/splat-mesh'
const sogLoader = new SogLoader({
  workerLimit: 1,
  wasmBaseUrl: './wasm/',
})
const data = await sogLoader.loadAsSplat('http://localhost:8080/jn_dmh.sog')
const splatWorker = new SplatWorker('../wasm/wasm_splat.worker.min.js')
const splatMesh = new SplatMesh()
splatMesh.attachWorker(splatWorker).setVertexCount(data.numSplats)
await splatMesh.setDataFromBuffer(data.buffer)
splatMesh.rotation.x = -Math.PI
world.add(splatMesh)
