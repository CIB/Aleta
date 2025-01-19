import { TemporaryCacheDriver } from '../llm/cache';
import { DummyBackend } from '../llm/dummy-backend';
import { SystemContext } from './system-context';

export function createTestSystemContext(defaultResponse?: string): SystemContext {
  return new SystemContext(new DummyBackend(new TemporaryCacheDriver(), defaultResponse || '{}'));
}
