/**
 * frontend\src\utils\webgl.js
 * Implements this RepForge module's single responsibility while preserving its existing public behavior.
 */

let _webglSupported = null;

export function isWebGLAvailable() {
  if (typeof window === "undefined") return false;
  if (_webglSupported !== null) return _webglSupported;

  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    _webglSupported = Boolean(gl && gl instanceof WebGLRenderingContext);
    if (gl && typeof gl.getExtension === "function") {
      const loseContext = gl.getExtension("WEBGL_lose_context");
      loseContext?.loseContext?.();
    }
  } catch {
    _webglSupported = false;
  }
  return _webglSupported;
}
