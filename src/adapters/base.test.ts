import { describe, it, expect, vi } from 'vitest';
import { AdapterRegistry, ToolAdapter } from './base.js';

function createMockAdapter(name: string, available: boolean = true): ToolAdapter {
  return {
    name,
    displayName: `${name} Tool`,
    color: '\x1b[0m',
    promptPattern: />/,
    idleTimeout: 1000,
    startupDelay: 1000,
    isAvailable: vi.fn().mockResolvedValue(available),
    send: vi.fn().mockResolvedValue('response'),
    resetContext: vi.fn(),
    getCommand: vi.fn().mockReturnValue([name]),
    getInteractiveCommand: vi.fn().mockReturnValue([name]),
    getPersistentArgs: vi.fn().mockReturnValue([]),
    cleanResponse: vi.fn().mockImplementation((s: string) => s),
    hasSession: vi.fn().mockReturnValue(false),
    setHasSession: vi.fn(),
  };
}

describe('AdapterRegistry', () => {
  it('registers and retrieves an adapter by name', () => {
    const registry = new AdapterRegistry();
    const adapter = createMockAdapter('test');

    registry.register(adapter);

    expect(registry.get('test')).toBe(adapter);
  });

  it('returns undefined for unregistered adapter', () => {
    const registry = new AdapterRegistry();

    expect(registry.get('nonexistent')).toBeUndefined();
  });

  it('returns all registered adapters', () => {
    const registry = new AdapterRegistry();
    const a1 = createMockAdapter('first');
    const a2 = createMockAdapter('second');

    registry.register(a1);
    registry.register(a2);

    const all = registry.getAll();
    expect(all).toHaveLength(2);
    expect(all).toContain(a1);
    expect(all).toContain(a2);
  });

  it('returns all adapter names', () => {
    const registry = new AdapterRegistry();
    registry.register(createMockAdapter('claude'));
    registry.register(createMockAdapter('gemini'));

    expect(registry.getNames()).toEqual(['claude', 'gemini']);
  });

  it('filters to only available adapters', async () => {
    const registry = new AdapterRegistry();
    registry.register(createMockAdapter('available-tool', true));
    registry.register(createMockAdapter('unavailable-tool', false));

    const available = await registry.getAvailable();

    expect(available).toHaveLength(1);
    expect(available[0].name).toBe('available-tool');
  });

  it('returns empty array when no adapters registered', () => {
    const registry = new AdapterRegistry();

    expect(registry.getAll()).toHaveLength(0);
    expect(registry.getNames()).toHaveLength(0);
  });

  it('overwrites adapter with same name on re-register', () => {
    const registry = new AdapterRegistry();
    const first = createMockAdapter('tool');
    const second = createMockAdapter('tool');

    registry.register(first);
    registry.register(second);

    expect(registry.get('tool')).toBe(second);
    expect(registry.getAll()).toHaveLength(1);
  });
});
