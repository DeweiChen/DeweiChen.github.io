// Room edges: fully lit ahead of the scan, dimmed to an outline once solid.
uniform float uScan;
uniform float uWire;     // 0..1 overall wireframe opacity
uniform vec2 uWidth;

varying vec3 vPos;

const vec3 CYAN = vec3(0.18, 0.72, 0.95);
const vec3 VIOLET = vec3(0.58, 0.3, 0.98);

void main() {
  float below = uScan - vPos.y;
  vec3 accent = mix(CYAN, VIOLET, clamp((vPos.x - uWidth.x) / (uWidth.y - uWidth.x), 0.0, 1.0));
  float scanned = below > 0.0 ? 0.35 : 0.8;
  float band = exp(-abs(below) * 10.0);
  gl_FragColor = vec4(accent * (scanned + band * 1.5), uWire * (scanned + band));
}
