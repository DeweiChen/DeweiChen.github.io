// Painted text that scans in top to bottom, with a glowing leading edge,
// the same reveal the room uses for its surfaces.
uniform sampler2D uMap;
uniform float uReveal;   // 0 = hidden, 1 = fully shown
uniform float uGlow;     // extra brightness, e.g. on hover

varying vec2 vUv;

const vec3 CYAN = vec3(0.18, 0.72, 0.95);
const vec3 VIOLET = vec3(0.58, 0.3, 0.98);

void main() {
  float edge = 1.0 - uReveal * 1.1;
  float shown = smoothstep(edge - 0.01, edge + 0.01, vUv.y);
  float band = exp(-abs(vUv.y - edge) * 60.0) * step(0.001, uReveal) * step(uReveal, 0.999);

  vec4 tex = texture2D(uMap, vUv);
  vec3 accent = mix(CYAN, VIOLET, vUv.x);
  vec3 color = tex.rgb * (1.0 + uGlow) + accent * band * 1.5;
  float alpha = tex.a * shown + band * 0.6;
  if (alpha < 0.003) discard;
  gl_FragColor = vec4(color, alpha);
}
