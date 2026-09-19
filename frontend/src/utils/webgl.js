let _webglSupported = null;

export function isWebGLAvailable() {
  if (typeof window === "undefined") return false;
  if (_webglSupported !== null) return _webglSupported;

  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    _webglSupported = Boolean(gl && gl instanceof WebGLRenderingContext);
  } catch {
    _webglSupported = false;
  }
  return _webglSupported;
}
