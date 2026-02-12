# Splat Mesh

A lightweight, high-performance 3D Gaussian Splatting renderer for Three.js. This implementation uses:

- GPU texture packing
- Instanced rendering
- View-dependent sorting in WebWorker
- Optional frustum-aware sorting
- Designed for large-scale splat datasets (100K–1M+ splats).

## Introduction

SplatMesh is a custom Three.js Mesh implementation that renders Gaussian splats using:

- DataTexture for storing splat attributes
- InstancedBufferGeometry for drawing
- WebWorker for per-frame view-space sorting

The renderer supports dynamic camera movement and maintains correct blending order by sorting splats every frame.

## Principle Overview

### Data Storage

Each splat is stored in two GPU textures:

| Texture               | Format   | Content                 |
|-----------------------|----------|-------------------------|
| centerAndScaleTexture | RGBA32F  | center.xyz + scale      |
| covAndColorTexture    | RGBA32UI | rotation + packed color |

Texture size:

```js

const width = maxTextureSize
const height = ceil(vertexCount / width)

```

### Rendering Pipeline

```
Input buffer / geometry
        ↓
Worker: process splats
        ↓
Upload packed textures to GPU
        ↓
Per frame:
   compute modelView matrix
   worker sorts splats
   update splatIndex buffer
        ↓
Instanced rendering
```

Sorting is view-dependent to ensure correct blending.

## Usage

```js
const worker = new SplatWorker('***/wasm_splat.worker.min.js')
const splatMesh = new SplatMesh()
splatMesh.attachWorker(worker)
splatMesh.setVertexCount(data.numSplats)
await splatMesh.setDataFromBuffer(data.buffer)
scene.add(splatMesh)
```

## Why the Worker Is Injected

> The worker is injected externally to separate rendering logic from CPU-intensive computation. SplatMesh focuses purely
> on GPU resources and drawing, while the Worker handles heavy tasks such as splat processing, view-dependent sorting,
> and
> bounds computation. This design allows multiple meshes to share a single Worker (and WASM instance), reduces memory
> and
> thread overhead, improves lifecycle control, and follows a clean dependency injection architecture. In short, the mesh
> renders, the worker computes — keeping the system modular, efficient, and scalable.

## Examples

Live examples demonstrating different input formats:

- PLY Example: `examples/ply.html`
- SOG Example: `examples/sog.html`
- SPLAT Example: `examples/splat.html`
- SPZ Example : `examples/spz.html`

> You can use the [3dgs-loader](https://www.npmjs.com/package/3dgs-loader) library to load 3D Gaussian Splatting data in
> formats such as .ply, .splat, .spz, or .sog. It provides a unified and browser-friendly API that parses and decodes
> the data into a standardized { numSplats, buffer } structure, which can be passed directly to SplatMesh. The loader is
> available via CDN (e.g. https://cdn.jsdelivr.net/npm/3dgs-loader@1.2.0/+esm) and is recommended for simplifying data
> loading while keeping rendering and parsing responsibilities cleanly separated.

## SplatMesh API

### Constructor

```js
const mesh = new SplatMesh()
```

### Properties

- `{Number} vertexCount` : Number of splats, Must be set before loading data.
- `{Number} threshold` : Sorting threshold value.
- `{SplatWoker} worker` : Attached sorting worker.
- `{Array} bounds` : Bounding box (after computeBounds()).
- `{Boolean} useFrustumCulled` : Enable frustum planes for worker-side culling.

### Methods

- `detachWorker(worker):SplatMesh` : Attach a Worker instance.

```js
mesh.attachWorker(worker)
```

- `detachWorker():SplatMesh` : Detach current worker.

```js
mesh.detachWorker()
```

- `setVertexCount(count):SplatMesh` : Allocate textures and instance attributes, Must be called before loading splat
  data.

```js
mesh.setVertexCount(1000)
```

- `setDataFromBuffer(buffer):Promise<SplatMesh>` : Load splat data from ArrayBuffer.

```js
await mesh.setDataFromBuffer(buffer)
```

- `setDataFromGeometry(geometry):Promise<SplatMesh>` : Load splats from Three.js geometry.

```js
await mesh.setDataFromGeometry(geometry)
```

- `setDataFromSpz(spzData):Promise<SplatMesh>` : Load splats from SPZ data structure.

```js
await mesh.setDataFromSpz(spzData)
```

- `computeBounds():Promise<SplatMesh>` : Compute bounding box via worker.

```js
await mesh.computeBounds()
```

- `dispose()` : Release GPU resources and unregister worker data.

```js
mesh.dispose()
```
