import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';

const cache = new WeakMap();

/** Material fosco com cor sólida (specular baixo para não lavar). */
export function mat(scene, hex, { specular = 0.12, emissive = 0 } = {}) {
  let byKey = cache.get(scene);
  if (!byKey) cache.set(scene, (byKey = new Map()));
  const key = `${hex}|${specular}|${emissive}`;
  if (byKey.has(key)) return byKey.get(key);
  const m = new StandardMaterial(`m${hex}`, scene);
  const c = Color3.FromHexString(hex);
  m.diffuseColor = c;
  m.specularColor = new Color3(specular, specular, specular);
  m.specularPower = 32;
  m.emissiveColor = c.scale(emissive);
  byKey.set(key, m);
  return m;
}
