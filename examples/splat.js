import { SplatLoader } from '3dgs-loader'
import { SplatWorker, SplatMesh } from '@dvt3d/splat-mesh'

const splatLoader = new SplatLoader()

const data = await splatLoader.load('http://localhost:8080/ggy.splat')

const splatWorker = new SplatWorker('../wasm/wasm_splat.worker.min.js')

let splatMesh = new SplatMesh()
splatMesh.attachWorker(splatWorker)
splatMesh.setVertexCount(data.numSplats)
await splatMesh.setDataFromBuffer(data.buffer)
splatMesh.rotation.x = -Math.PI
world.add(splatMesh)
