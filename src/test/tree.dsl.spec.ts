import { describe, test, expect } from 'bun:test';
import { Tree } from '../tree/tree';
import { DslSerializer } from '../tree/tree-dsl-serializer';
import { DslParser } from '../tree/tree-dsl';

describe('Tree DSL Serialization', () => {
  test('should round-trip basic tree structure', () => {
    const tree = new Tree();
    tree.set(['foo'], 'bar');
    tree.set(['nested', 'value'], 42);
    tree.createList(['items']);
    tree.push(['items'], 'first');
    tree.push(['items'], 'second');

    const serialized = new DslSerializer().serialize(tree);
    const parsed = new DslParser().parse(serialized);

    expect(parsed.getJSON([])).toEqual(tree.getJSON([]));
  });

  test('should handle module declarations', () => {
    const tree = new Tree();
    tree.createModule(['myModule']);
    tree.set(['myModule', 'config', 'enabled'], true);

    const serialized = new DslSerializer().serialize(tree);
    expect(serialized).toContain('$module: true');

    const parsed = new DslParser().parse(serialized);
    expect(parsed.getNode(['myModule']).isModule).toBeTrue();
  });

  test('should preserve data types', () => {
    const tree = new Tree();
    tree.set(['string'], 'multi\nline');
    tree.set(['number'], 42);
    tree.set(['boolean'], true);
    tree.set(['null'], null);

    const serialized = new DslSerializer().serialize(tree);
    const parsed = new DslParser().parse(serialized);

    expect(parsed.get(['string'])).toBe('multi\nline');
    expect(parsed.get(['number'])).toBe(42);
    expect(parsed.get(['boolean'])).toBe(true);
    expect(parsed.get(['null'])).toBeNull();
  });

  test('should collapse single-child chains', () => {
    const tree = new Tree();
    tree.set(['collapse', 'chain', 'value'], 'test');

    const serialized = new DslSerializer().serialize(tree);
    expect(serialized).toContain('collapse/chain');

    const parsed = new DslParser().parse(serialized);
    expect(parsed.nodeExists(['collapse', 'chain'])).toBeTrue();
  });

  test('should handle complex nested structures', () => {
    const tree = new Tree();
    tree.createModule(['app']);
    tree.set(['app', 'config', 'timeout'], 5000);
    tree.createList(['app', 'services']);
    tree.push(['app', 'services'], { name: 'db', type: 'database' });
    tree.push(['app', 'services'], { name: 'api', enabled: true });

    const serialized = new DslSerializer().serialize(tree);
    console.log(serialized);
    const parsed = new DslParser().parse(serialized);

    expect(parsed.getJSON([])).toEqual(tree.getJSON([]));
    expect(serialized).toMatchSnapshot();
  });

  test('should handle empty tree', () => {
    const tree = new Tree();
    const serialized = new DslSerializer().serialize(tree);
    expect(serialized.trim()).toBe('');

    const parsed = new DslParser().parse(serialized);
    expect(parsed.getJSON([])).toEqual(tree.getJSON([]));
  });

  test('should preserve order of module property', () => {
    const tree = new Tree();
    tree.createModule(['ordered']);
    tree.set(['ordered', 'a'], 1);
    tree.set(['ordered', 'z'], 26);

    const serialized = new DslSerializer().serialize(tree);
    expect(serialized).toMatch(/\$module: true/);
  });

  test('should handle paths with slashes in keys', () => {
    const yamlContent = `
    'with/slash':
      $module: true
    `;

    const parsed = new DslParser().parse(yamlContent);
    expect(parsed.nodeExists(['with/slash'])).toBeFalse();
    expect(parsed.nodeExists(['with', 'slash'])).toBeTrue();
    expect(parsed.getNode(['with', 'slash']).isModule).toBeTrue();
  });
});
