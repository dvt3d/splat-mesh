import SplatMesh from './core/SplatMesh'
import SplatWorker from './core/SplatWorker'

export { SplatMesh, SplatWorker }

if (typeof window !== 'undefined') {
  window.SplatMesh = SplatMesh
  window.SplatWorker = SplatWorker
}
