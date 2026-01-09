import { PlyLoader } from '3dgs-loader'
import { SplatWorker, SplatMesh } from '@dvt3d/splat-mesh'
const plyLoader = new PlyLoader()
const data = await plyLoader.loadAsSplat('http://localhost:8080/ggy.ply')
const splatWorker = new SplatWorker('../wasm/wasm_splat.worker.min.js')

let splatMesh = new SplatMesh()

splatMesh.attachWorker(splatWorker)
splatMesh.setVertexCount(data.numSplats)
await splatMesh.setDataFromBuffer(data.buffer)
splatMesh.rotation.x = -Math.PI

world.add(splatMesh)
