varying vec3 vColor;
varying float vAlpha;

void main() {
  // Isotropic gaussian footprint, the same falloff a 3DGS splat uses.
  vec2 c = gl_PointCoord - 0.5;
  float a = exp(-dot(c, c) * 18.0);
  if (a < 0.02) discard;
  gl_FragColor = vec4(vColor, a * vAlpha);
}
