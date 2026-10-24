// 3DGS-flavoured point splats.
// Each particle lives on two shapes: a flat rectangle matching the 2D hero card
// (aPlaneUV) and the name portrait (aTarget). uMorph blends between them, and
// the cursor pushes particles away on top of whichever shape is showing.
// Scrolling then flies them onto the room's edges (aRoom), a point cloud scan.
uniform float uTime;
uniform float uMorph;      // 0 = flat card, 1 = portrait
uniform float uAssemble;   // 0 = name, 1 = on the room's edges
uniform float uFade;       // dims the point cloud once the wireframe takes over
uniform float uSize;
uniform float uPixelRatio;
uniform vec4 uRect;        // card in world units: center.xy, size.xy
uniform vec3 uPortrait;    // scale, offset.y, unused
uniform vec2 uMouse;       // smoothed cursor on the z = 0 plane
uniform vec2 uMouseVel;
uniform float uMouseStrength;
uniform float uRadius;

attribute vec2 aPlaneUV;
attribute vec3 aTarget;
attribute vec3 aRoom;
attribute vec3 aColor;
attribute float aSeed;

varying vec3 vColor;
varying float vAlpha;

void main() {
  vec3 target = vec3(aTarget.xy * uPortrait.x + vec2(0.0, uPortrait.y), aTarget.z);
  vec3 plane = vec3(
    uRect.x + (aPlaneUV.x - 0.5) * uRect.z,
    uRect.y - (aPlaneUV.y - 0.5) * uRect.w,
    0.0
  );

  // Staggered morph so the card "peels" into particles instead of moving as one sheet.
  float delay = aSeed * 0.4;
  float e = clamp((uMorph - delay) / (1.0 - 0.4), 0.0, 1.0);
  e = e * e * (3.0 - 2.0 * e);

  vec3 burstDir = normalize(vec3(sin(aSeed * 91.7), cos(aSeed * 53.1), sin(aSeed * 17.3) * 0.8 + 0.6));
  vec3 pos = mix(plane, target, e);
  pos += burstDir * sin(e * 3.14159) * 1.4;

  // Idle breathing.
  pos.x += sin(uTime * 0.7 + aSeed * 40.0) * 0.015;
  pos.y += cos(uTime * 0.6 + aSeed * 31.0) * 0.015;
  pos.z += sin(uTime * 0.5 + aSeed * 23.0) * 0.04;

  // Scrolling flies each particle onto the room in a staggered arc.
  float a = clamp((uAssemble - aSeed * 0.35) / 0.65, 0.0, 1.0);
  a = a * a * (3.0 - 2.0 * a);
  vec3 room = aRoom + vec3(sin(aSeed * 71.0), cos(aSeed * 37.0), sin(aSeed * 13.0)) * 0.012;
  pos = mix(pos, room, a) + burstDir * sin(a * 3.14159) * 1.2;

  // Cursor repulsion; particles fall back on their own once the cursor leaves.
  vec2 diff = pos.xy - uMouse;
  float dist = length(diff);
  float f = smoothstep(uRadius, 0.0, dist);
  f = f * f * uMouseStrength; // softer edge so the cursor doesn't leave a hard ring
  // Push stays well below the radius so particles never fold over each other into a hard ring.
  pos.xy += normalize(diff + 1e-4) * f * uRadius * 0.28;
  pos.xy += uMouseVel * f * 0.05;
  pos.z += f * (aSeed - 0.5) * 0.5;

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * (0.55 + aSeed * 0.9) * uPixelRatio * (1.0 + f * 0.2) / -mv.z;

  vColor = aColor * (1.0 + f * 0.3);
  vAlpha = mix(0.42, 0.6, a) * uFade;
}
