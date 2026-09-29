// The ark as a solid: 300 × 50 × 30 cubits (about 137 × 23 × 14 m), a pitched roof over a
// cubit-high window strip, a door in the side, and dark pitched timber. Local frame: x along the
// hull, y up from the keel, z across.
export const ARK_GLSL = /* glsl */ `
float arkSDF(vec3 p) {
  vec3 q = p;
  // hull: sides flare out from a narrower keel, ends slightly raked
  float taper = 1.0 - 0.22 * sat((6.0 - q.y) / 6.0);
  vec3 hq = vec3(q.x, q.y - 5.5, q.z / taper);
  float hull = sdBox(hq, vec3(66.0 - 2.5 * sat((6.0 - q.y) / 6.0), 5.5, 11.2)) * taper - 0.25;
  // house above the hull, with the window strip cut all round beneath the eaves
  float house = sdBox(q - vec3(0.0, 12.2, 0.0), vec3(63.0, 1.3, 10.4));
  float strip = sdBox(q - vec3(0.0, 12.9, 0.0), vec3(70.0, 0.28, 12.0));
  house = max(house, -max(strip, -sdBox(q - vec3(0.0, 12.9, 0.0), vec3(62.2, 0.5, 9.6))));
  // pitched roof with eaves
  vec3 r = q - vec3(0.0, 13.6, 0.0);
  float roof = max(sdBox(r, vec3(64.5, 2.2, 11.8)), (abs(r.z) * 0.36 + r.y) - 1.2);
  roof = max(roof, -r.y - 0.25);
  float d = min(min(hull, house), roof);
  // door in the side
  float door = sdBox(q - vec3(18.0, 7.0, 11.4), vec3(2.6, 3.2, 0.7));
  d = max(d, -door);
  return d;
}
// timber: strakes along the hull, boards on the house, shingles on the roof
vec3 arkColor(vec3 p, vec3 n, out float rough) {
  float strake = floor(p.y / 0.62);
  float g = fbm(vec2(p.x * 0.35 + strake * 9.1, p.y * 12.0 + strake), 4);
  vec3 c = mix(vec3(0.03, 0.025, 0.022), vec3(0.11, 0.085, 0.065), g * g * 1.6);
  float seam = smoothstep(0.03, 0.0, abs(fract(p.y / 0.62) - 0.5) - 0.47);
  c *= 1.0 - 0.6 * seam;
  if (p.y > 13.4) {
    float sh = floor(p.x / 1.1) + floor(abs(p.z) / 0.8) * 7.0;
    c = mix(vec3(0.05, 0.045, 0.04), vec3(0.12, 0.1, 0.085), 0.5 + 0.5 * (vnoise(vec2(p.x / 1.1, abs(p.z) / 0.8) * 1.0) - 0.5) + 0.3 * fbm(p.xz * 0.2, 3));
  }
  float streak = fbm(vec2(p.x * 3.0, p.y * 0.2), 3);
  c *= 0.75 + 0.5 * streak;
  rough = 0.55 + 0.3 * g;
  return c;
}
`;
