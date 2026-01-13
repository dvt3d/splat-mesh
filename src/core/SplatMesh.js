import {
  BufferAttribute,
  BufferGeometry,
  CustomBlending,
  DataTexture,
  DynamicDrawUsage,
  FloatType,
  InstancedBufferAttribute,
  InstancedBufferGeometry,
  Mesh,
  OneFactor,
  RGBAFormat,
  RGBAIntegerFormat,
  ShaderMaterial,
  UnsignedIntType,
  Vector4,
  Frustum,
  Matrix4,
} from 'three'
import gaussian_splatting_vs from '../shaders/gaussian_splatting_vs.glsl'
import gaussian_splatting_fs from '../shaders/gaussian_splatting_fs.glsl'
import SortScheduler from './SortScheduler'
import { uuid, getMaxTextureSize } from '../utils'

const maxTextureSize = getMaxTextureSize()
const maxVertexes = maxTextureSize * maxTextureSize

const _baseGeometry = new BufferGeometry()
_baseGeometry.setAttribute(
  'position',
  new BufferAttribute(
    new Float32Array([
      -2.0, -2.0, 0.0, 2.0, 2.0, 0.0, -2.0, 2.0, 0.0, 2.0, -2.0, 0.0, 2.0, 2.0,
      0.0, -2.0, -2.0, 0.0,
    ]),
    3,
  ),
)

class SplatMesh extends Mesh {
  constructor() {
    super()
    this._meshId = uuid()
    this._vertexCount = 0
    this._textureWidth = maxTextureSize
    this._textureHeight = 1
    this._threshold = -0.00001
    this._centerAndScaleData = null
    this._centerAndScaleTexture = null
    this._rotationAndColorData = null
    this._rotationAndColorTexture = null
    this.geometry = new InstancedBufferGeometry().copy(_baseGeometry)
    this.geometry.instanceCount = 1
    this.material = new ShaderMaterial({
      uniforms: {
        viewport: { value: new Float32Array([1980, 1080]) }, // Dummy. will be overwritten
        centerAndScaleTexture: { value: null },
        covAndColorTexture: { value: null },
        gsModelViewMatrix: { value: null },
      },
      vertexShader: gaussian_splatting_vs,
      fragmentShader: gaussian_splatting_fs,
      blending: CustomBlending,
      blendSrcAlpha: OneFactor,
      depthTest: true,
      depthWrite: false,
      transparent: true,
    })
    this.material.onBeforeRender = this._onMaterialBeforeRender.bind(this)
    this.frustumCulled = false
    this._bounds = null
    this._sortScheduler = new SortScheduler()
    this._worker = null
    this._useFrustumCulled = false
  }

  get isSplatMesh() {
    return true
  }

  set threshold(threshold) {
    this._threshold = threshold
  }

  get threshold() {
    return this._threshold
  }

  set worker(worker) {
    this._worker = worker
  }

  get worker() {
    return this._worker
  }

  get bounds() {
    return this._bounds
  }

  set vertexCount(vertexCount) {
    this.setVertexCount(vertexCount)
  }

  get vertexCount() {
    return this._vertexCount
  }

  set useFrustumCulled(v) {
    this._useFrustumCulled = v
  }

  get useFrustumCulled() {
    return this._useFrustumCulled
  }

  get sortScheduler() {
    return this._sortScheduler
  }

  /**
   *
   * @param camera
   * @returns {Matrix4}
   * @private
   */
  _getModelViewMatrix(camera) {
    let viewMatrix = camera.matrixWorld.clone().invert()
    return viewMatrix.multiply(this.matrixWorld)
  }

  /**
   *
   * @param data
   * @param vertexCount
   * @private
   */
  _updateTexture(data, vertexCount) {
    if (data && this._meshId === data.meshId) {
      this._centerAndScaleData.set(data.out_cs)
      this._rotationAndColorData.set(data.out_rc)
      this._centerAndScaleTexture.image.data.set(
        this._centerAndScaleData.subarray(0, vertexCount * 4),
        0,
      )
      this._rotationAndColorTexture.image.data.set(
        this._rotationAndColorData.subarray(0, vertexCount * 4),
        0,
      )
      this._centerAndScaleTexture.needsUpdate = true
      this._rotationAndColorTexture.needsUpdate = true
      this._sortScheduler.dirty = true
    }
  }

  /**
   *
   * @param renderer
   * @param scene
   * @param camera
   * @param geometry
   * @param object
   * @param group
   * @private
   */
  _onMaterialBeforeRender(renderer, scene, camera, geometry, object, group) {
    let modelViewMatrix = this._getModelViewMatrix(camera)

    this._sortScheduler &&
      this._sortScheduler.tick(modelViewMatrix, () => {
        const camera_mtx = modelViewMatrix.elements
        const view = new Float32Array([
          camera_mtx[2],
          camera_mtx[6],
          camera_mtx[10],
          camera_mtx[14],
        ])

        let planes = new Float32Array(0)
        if (this._useFrustumCulled) {
          planes = new Float32Array(6 * 4)
          const projViewMatrix = new Matrix4()
          projViewMatrix.multiplyMatrices(
            camera.projectionMatrix,
            camera.matrixWorldInverse,
          )
          const frustum = new Frustum()
          frustum.setFromProjectionMatrix(projViewMatrix)
          frustum.planes.forEach((p, i) => {
            planes[i * 4 + 0] = p.normal.x
            planes[i * 4 + 1] = p.normal.y
            planes[i * 4 + 2] = p.normal.z
            planes[i * 4 + 3] = p.constant
          })
        }
        this._worker &&
          this._worker
            .call('sort_splats', this._meshId, view, planes, this._threshold)
            .then((result) => {
              if (!result) {
                this._sortScheduler.isSorting = false
              }
              if (result && this._meshId === result.meshId) {
                const indexes = new Uint32Array(result.data)
                this.geometry.attributes.splatIndex.set(indexes)
                this.geometry.attributes.splatIndex.needsUpdate = true
                this.geometry.instanceCount = indexes.length
                this._sortScheduler.isSorting = false
              }
            })
      })
    const material = object.material
    material.uniforms.gsModelViewMatrix.value = modelViewMatrix
    const viewport = new Vector4()
    renderer.getCurrentViewport(viewport)
    material.uniforms.viewport.value[0] = viewport.z
    material.uniforms.viewport.value[1] = viewport.w
  }

  /**
   *
   * @param vertexCount
   */
  setVertexCount(vertexCount) {
    if (vertexCount === this._vertexCount) {
      return
    }
    this._vertexCount = Math.min(vertexCount, maxVertexes)

    this._textureHeight =
      Math.floor((this._vertexCount - 1) / this._textureWidth) + 1

    this._centerAndScaleData = new Float32Array(
      this._textureWidth * this._textureHeight * 4,
    )

    if (this._centerAndScaleTexture) {
      this._centerAndScaleTexture.dispose()
    }

    this._centerAndScaleTexture = new DataTexture(
      this._centerAndScaleData,
      this._textureWidth,
      this._textureHeight,
      RGBAFormat,
      FloatType,
    )

    this._rotationAndColorData = new Uint32Array(
      this._textureWidth * this._textureHeight * 4,
    )

    if (this._rotationAndColorTexture) {
      this._rotationAndColorTexture.dispose()
    }

    this._rotationAndColorTexture = new DataTexture(
      this._rotationAndColorData,
      this._textureWidth,
      this._textureHeight,
      RGBAIntegerFormat,
      UnsignedIntType,
    )
    this._rotationAndColorTexture.internalFormat = 'RGBA32UI'

    const splatIndexArray = new Uint32Array(
      this._textureWidth * this._textureHeight,
    )
    const splatIndexes = new InstancedBufferAttribute(splatIndexArray, 1, false)
    splatIndexes.setUsage(DynamicDrawUsage)
    this.geometry.setAttribute('splatIndex', splatIndexes)
    this.material.uniforms.centerAndScaleTexture.value =
      this._centerAndScaleTexture
    this.material.uniforms.covAndColorTexture.value =
      this._rotationAndColorTexture
    return this
  }

  /**
   *
   * @param worker
   * @returns {SplatMesh}
   */
  attachWorker(worker) {
    this._worker = worker
    return this
  }

  /**
   *
   * @returns {SplatMesh}
   */
  detachWorker() {
    if (this._worker) {
      this._worker.call('unregister_positions', this._bufferId)
    }
    this._worker = null
    return this
  }

  /**
   *
   * @param buffer
   * @param vertexCount
   * @returns {SplatMesh}
   */
  async setDataFromBuffer(buffer) {
    if (this._vertexCount <= 0) {
      console.warn('[SplatMesh] setDataFromBuffer skipped: vertexCount is 0')
      return this
    }
    if (!this._worker) {
      console.warn('[SplatMesh] setDataFromBuffer skipped: worker not ready')
      return this
    }
    const data = await this._worker.call(
      'process_splats_from_buffer',
      this._meshId,
      buffer,
      this._vertexCount,
    )
    this._updateTexture(data, this._vertexCount)
    this._bounds = null
    return this
  }

  /**
   *
   * @param geometry
   * @returns {SplatMesh}
   */
  async setDataFromGeometry(geometry) {
    if (this._vertexCount <= 0) {
      console.warn('[SplatMesh] setDataFromGeometry skipped: vertexCount is 0')
      return this
    }
    if (!this._worker) {
      console.warn('[SplatMesh] setDataFromGeometry skipped: worker not ready')
      return this
    }
    const data = await this._worker.call(
      'process_splats_from_geometry',
      this._meshId,
      geometry.attributes.position.array,
      geometry.attributes._scale.array,
      geometry.attributes._rotation.array,
      geometry.attributes.color.array,
      this._vertexCount,
    )
    this._updateTexture(data, this._vertexCount)
    this._bounds = null
    return this
  }

  /**
   *
   * @param spzData
   * @returns {SplatMesh}
   */
  async setDataFromSpz(spzData) {
    if (this._vertexCount <= 0) {
      console.warn('[SplatMesh] setDataFromSpz skipped: vertexCount is 0')
      return this
    }
    if (!this._worker) {
      console.warn('[SplatMesh] setDataFromSpz skipped: worker not ready')
      return this
    }
    const data = await this._worker.call(
      'process_splats_from_spz',
      this._meshId,
      spzData.positions,
      spzData.scales,
      spzData.rotations,
      spzData.colors,
      spzData.alphas,
      this._vertexCount,
    )
    this._updateTexture(data, this._vertexCount)
    this._bounds = null
    return this
  }

  /**
   *
   */
  async computeBounds() {
    if (!this._worker) {
      console.warn('[SplatMesh] computeBounds skipped: worker not ready')
      return this
    }
    if (!this._bounds) {
      const result = await this._worker.call('compute_bounds', this._meshId)
      if (this._meshId === result.meshId) {
        this._bounds = result.data
      }
    }
    return this
  }

  /**
   *
   */
  dispose() {
    this._bounds = null
    if (this._centerAndScaleTexture) {
      this._centerAndScaleTexture.dispose()
      this._centerAndScaleData = null
    }
    if (this._rotationAndColorTexture) {
      this._rotationAndColorTexture.dispose()
      this._rotationAndColorData = null
    }
    if (this._worker) {
      this._worker.call('unregister_positions', this._bufferId)
    }
    this._bufferId = null
    this._sortScheduler = null
    this.geometry.dispose()
    this.material.dispose()
    this.parent = null
  }
}

export default SplatMesh
