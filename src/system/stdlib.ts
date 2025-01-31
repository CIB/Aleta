// Load a pre-defined "standard library" for the system

import { buildNodeForConstructRecipe } from '../language/recipe/construct-recipe';
import { SystemContext } from './system-context';

export function loadStdlib(system: SystemContext) {
  buildNodeForConstructRecipe(system);
}
