// Light falling on a surface, worked out per pixel in float so it stays smooth on the
// dark walls instead of banding into rings like an 8-bit gradient texture would.
// Drawn additively: the output colour is what the light adds.
uniform vec3 uColor;     // at the hot spot
uniform vec3 uEdge;      // towards the rim
uniform float uPeak;     // brightness at the hot spot, already scaled by how lit the lamp is
uniform vec2 uCenter;    // hot spot, (0, 0) top left
uniform float uStretch;  // horizontal stretch of the falloff
uniform float uRadius;   // falloff radius, as a fraction of the plane's height

varying vec2 vUv;

// Interleaved gradient noise: breaks up what banding is left when the result is stored in 8 bits.
float dither(vec2 p) {
  return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))) - 0.5;
}

void main() {
#ifdef BEAM
  // A cone of light: brightest at the lamp (top of the cylinder), fading out towards the floor.
  float r = 1.0 - vUv.y;
  float a = uPeak * pow(vUv.y, 1.6);
#else
  vec2 d = vec2((vUv.x - uCenter.x) / uStretch, (1.0 - vUv.y) - uCenter.y) / uRadius;
  float r = min(length(d), 1.0);
  float a = uPeak * (1.0 - r) * (1.0 - r);
#endif
  if (a <= 0.0) discard;
  vec3 color = mix(uColor, uEdge, r) * a + dither(gl_FragCoord.xy) / 255.0;
  gl_FragColor = vec4(max(color, 0.0), 1.0);
}
