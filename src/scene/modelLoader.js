// Ponto único para trocar modelos procedurais por .glb no futuro.
// Uso futuro: se existir `public/models/<nome>.glb`, carregar via
// SceneLoader.ImportMeshAsync('', `${import.meta.env.BASE_URL}models/`, '<nome>.glb', scene)
// e retornar o nó raiz no lugar do builder procedural.

/**
 * @param {string} name  nome do modelo (ex.: 'arduino-uno')
 * @param {() => import('@babylonjs/core').TransformNode} buildProcedural
 */
export function loadModelOrProcedural(name, buildProcedural) {
  return buildProcedural();
}
