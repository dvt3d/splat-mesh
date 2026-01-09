import { SpzLoader } from '3dgs-loader'
import { SplatWorker, SplatMesh } from '@dvt3d/splat-mesh'
const spzLoader = new SpzLoader()
const data = await spzLoader.loadAsSplat('http://localhost:8080/ggy_v3_1.spz')
const splatWorker = new SplatWorker('../wasm/wasm_splat.worker.min.js')
let splatMesh = new SplatMesh()
splatMesh.attachWorker(splatWorker)
splatMesh.setVertexCount(data.numSplats)
await splatMesh.setDataFromBuffer(data.buffer)
splatMesh.rotation.x = -Math.PI

world.add(splatMesh)
