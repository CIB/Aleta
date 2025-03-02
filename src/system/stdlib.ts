// Load a pre-defined "standard library" for the system

import { buildNodeForConstructRecipe } from '../language/recipe/construct-recipe';
import { SystemContext } from './system-context';

export async function loadStdlib(system: SystemContext) {
  await buildNodeForConstructRecipe(system);
}
