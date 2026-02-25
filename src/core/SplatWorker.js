import { resolveUrl } from '../utils'

export class SplatWorker {
  constructor(baseUrl, { timeout = 0 } = {}) {
    this._baseUrl = resolveUrl(baseUrl || './')
    this._workerUrl = new URL('wasm_splat.worker.min.js', this._baseUrl).href
    this._wasmUrl = new URL('wasm_splat_bg.wasm', this._baseUrl).href
    this._seq = 0
    this._pending = new Map()
    this._timeout = timeout
    this._initPromise = null
    this._ready = false
    this._createWorker()
  }

  /**
   *
   * @private
   */
  _createWorker() {
    const bindHandlers = (worker) => {
      worker.onmessage = (e) => this._handleMessage(e)
      worker.onerror = (err) => this._handleError(err)
      worker.onmessageerror = (err) =>
        console.error('[SplatWorker] Worker message error:', err)
    }
    try {
      this._worker = new Worker(this._workerUrl, { type: 'module' })
      bindHandlers(this._worker)
      return
    } catch (err) {}

    const wrapperCode = `
      import ${JSON.stringify(this._workerUrl)};
    `
    const wrapperUrl = URL.createObjectURL(
      new Blob([wrapperCode], { type: 'text/javascript' }),
    )
    this._worker = new Worker(wrapperUrl, { type: 'module' })
    bindHandlers(this._worker)
  }

  /**
   *
   * @param e
   * @private
   */
  _handleMessage(e) {
    const { id, result, error } = e.data
    const pending = this._pending.get(id)
    if (!pending) return
    this._pending.delete(id)
    if (error) pending.reject(error)
    else pending.resolve(result)
  }

  /**
   *
   * @param err
   * @private
   */
  _handleError(err) {
    console.error('[SplatWorker] Worker error:', err)
    for (const [id, pending] of this._pending) {
      pending.reject('[SplatWorker]Worker crashed')
    }
    this._pending.clear()
  }

  /**
   *
   * @param args
   * @returns {*[]}
   * @private
   */
  _collectTransferables(args) {
    const out = []
    for (const a of args) {
      if (!a) continue
      if (ArrayBuffer.isView(a)) out.push(a.buffer)
      else if (a instanceof ArrayBuffer) out.push(a)
    }
    return out
  }

  /**
   *
   * @returns {Promise<*|null|boolean>}
   */
  async init() {
    if (this._ready) return true
    if (this._initPromise) return this._initPromise

    this._initPromise = new Promise((resolve, reject) => {
      const id = ++this._seq
      this._pending.set(id, { resolve, reject })
      this._worker.postMessage({
        id,
        fn: '__init__',
        wasmUrl: this._wasmUrl,
        args: [],
      })
    })

    const ok = await this._initPromise
    this._ready = true
    return ok
  }

  /**
   *
   * @param fn
   * @param args
   * @returns {Promise<unknown>}
   */
  call(fn, ...args) {
    return new Promise((resolve, reject) => {
      if (!this._worker) {
        reject(`the worker ${this._workerUrl} does not exist`)
      }
      const id = ++this._seq
      this._pending.set(id, { resolve, reject })
      const transferables = this._collectTransferables(args)
      this._worker.postMessage(
        { id, fn, wasmUrl: this._wasmUrl, args },
        transferables,
      )
      if (this._timeout > 0) {
        setTimeout(() => {
          if (this._pending.has(id)) {
            this._pending.delete(id)
            reject(
              `[SplatWorker] Task "${fn}" timeout after ${this._timeout}ms`,
            )
          }
        }, this._timeout)
      }
    })
  }

  /**
   *
   * @param id
   * @param reason
   */
  cancel(id, reason = 'canceled') {
    const pending = this._pending.get(id)
    if (pending) {
      pending.reject(reason)
      this._pending.delete(id)
    }
    return this
  }

  /**
   *
   * @returns {SplatWorker}
   */
  dispose() {
    this._worker.terminate()
    this._pending.clear()
    return this
  }
}

export default SplatWorker
