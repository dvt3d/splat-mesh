/**
 * @Author: Caven
 * @Date: 2019-12-31 17:58:01
 */

const CHARS =
  '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')

/**
 * Generates uuid
 * @param prefix
 * @returns {string}
 */
export function uuid(prefix = 'D') {
  let uuid = []
  uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-'
  uuid[14] = '4'
  let r
  for (let i = 0; i < 36; i++) {
    if (!uuid[i]) {
      r = 0 | (Math.random() * 16)
      uuid[i] = CHARS[i === 19 ? (r & 0x3) | 0x8 : r]
    }
  }
  return prefix + '-' + uuid.join('')
}

export function getMaxTextureSize() {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
  return gl.getParameter(gl.MAX_TEXTURE_SIZE)
}
