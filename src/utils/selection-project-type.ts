/**
 * The project type the law selection uses — one function for the engine's
 * selector and the liveness floor, so the floor is never a fraction of a law
 * set computed for another type (#371).
 *
 * A configured type wins, except `generic`: that is the config default and
 * says nothing about the stack, so the detector is asked, and the configured
 * value stays when the detector recognises nothing.
 */
import { ProjectTypeDetector } from './config/project-type-detector';

export function selectionProjectType(
  configured: string | undefined,
  projectRoot: string
): string | undefined {
  if (configured && configured !== 'generic') return configured;
  return ProjectTypeDetector.detectProjectType(projectRoot) ?? configured;
}
