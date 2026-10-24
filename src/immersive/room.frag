// Solid surfaces only exist below the scan plane; a bright band rides on it,
// like a reconstruction filling in a scanned mesh.
uniform float uScan;     // world-space height of the scan plane
uniform float uTime;
uniform vec2 uWidth;     // room x-range, for the cyan -> violet gradient

varying vec3 vPos;
varying vec3 vNormal;
varying float vTone;

const vec3 CYAN = vec3(0.18, 0.72, 0.95);
const vec3 VIOLET = vec3(0.58, 0.3, 0.98);

void main() {
  float below = uScan - vPos.y;
  if (below < 0.0) discard;

  vec3 n = normalize(vNormal);
  float light = 0.45 + 0.55 * max(dot(n, normalize(vec3(0.35, 0.8, 0.55))), 0.0);
  vec3 shell = mix(vec3(0.012, 0.013, 0.025), vec3(0.022, 0.022, 0.042), smoothstep(-1.6, 1.9, vPos.y));
  vec3 base = mix(shell, vec3(0.04, 0.035, 0.075), vTone) * light;

  vec3 accent = mix(CYAN, VIOLET, clamp((vPos.x - uWidth.x) / (uWidth.y - uWidth.x), 0.0, 1.0));

  // Freshly scanned surfaces keep a faint measurement grid that settles away.
  vec3 g = abs(fract(vPos * 2.0) - 0.5);
  float grid = smoothstep(0.47, 0.5, max(max(g.x * (1.0 - abs(n.x)), g.y * (1.0 - abs(n.y))), g.z * (1.0 - abs(n.z))));
  base += accent * grid * 0.3 * exp(-below * 3.0);

  float band = exp(-below * 14.0);
  base += accent * band * (1.2 + 0.2 * sin(uTime * 6.0 + vPos.x * 3.0));

  gl_FragColor = vec4(base, 1.0);
}
