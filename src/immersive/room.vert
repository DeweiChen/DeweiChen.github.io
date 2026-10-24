// Shared by the room's solid mesh and its wireframe. The room sits at the
// origin, so object space is world space.
attribute float aTone;

varying vec3 vPos;
varying vec3 vNormal;
varying float vTone;

void main() {
  vPos = position;
  vNormal = normal;
  vTone = aTone;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
