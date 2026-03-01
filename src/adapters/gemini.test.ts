import { describe, it, expect, beforeEach } from 'vitest';
import { GeminiAdapter } from './gemini.js';

describe('GeminiAdapter', () => {
  let adapter: GeminiAdapter;

  beforeEach(() => {
    adapter = new GeminiAdapter();
  });

  describe('properties', () => {
    it('has correct name', () => {
      expect(adapter.name).toBe('gemini');
    });

    it('has correct display name', () => {
      expect(adapter.displayName).toBe('Gemini CLI');
    });

    it('has a color defined', () => {
      expect(adapter.color).toContain('\x1b[');
    });

    it('has a prompt pattern', () => {
      expect(adapter.promptPattern).toBeInstanceOf(RegExp);
      // Gemini uses > at start of line
      expect(adapter.promptPattern.test('> ')).toBe(true);
    });

    it('has idle timeout set', () => {
      expect(adapter.idleTimeout).toBeGreaterThan(0);
    });

    it('has startup delay set', () => {
      expect(adapter.startupDelay).toBeGreaterThan(0);
    });
  });

  describe('getCommand', () => {
    it('includes --output-format json', () => {
      const cmd = adapter.getCommand('hello');
      expect(cmd).toContain('--output-format');
      expect(cmd).toContain('json');
    });

    it('starts with gemini command', () => {
      const cmd = adapter.getCommand('test');
      expect(cmd[0]).toBe('gemini');
    });

    it('puts prompt as last argument', () => {
      const cmd = adapter.getCommand('my prompt');
      expect(cmd[cmd.length - 1]).toBe('my prompt');
    });

    it('does not include --resume on first call', () => {
      const cmd = adapter.getCommand('hello');
      expect(cmd).not.toContain('--resume');
    });
  });

  describe('cleanResponse', () => {
    it('strips ANSI escape codes', () => {
      const result = adapter.cleanResponse('\x1b[95mHello\x1b[0m');
      expect(result).not.toContain('\x1b[');
      expect(result).toContain('Hello');
    });

    it('removes spinner frames', () => {
      const result = adapter.cleanResponse('Loading... ');
      expect(result).not.toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
    });

    it('removes credential loading message', () => {
      const result = adapter.cleanResponse('Loaded cached credentials.\nActual response');
      expect(result).not.toContain('Loaded cached credentials');
      expect(result).toContain('Actual response');
    });

    it('removes box drawing characters', () => {
      const input = '╭──────╮\n│ text │\n╰──────╯';
      const result = adapter.cleanResponse(input);
      expect(result).not.toContain('╭');
    });

    it('removes prompt character', () => {
      const result = adapter.cleanResponse('Response text\n> \n');
      expect(result).not.toMatch(/^>\s*$/m);
    });

    it('removes esc-to-interrupt hints', () => {
      const result = adapter.cleanResponse('Some content (esc to interrupt) more');
      expect(result).not.toContain('esc to interrupt');
    });

    it('handles empty input', () => {
      expect(adapter.cleanResponse('')).toBe('');
    });

    it('deduplicates consecutive identical lines', () => {
      const input = 'Same line\nSame line\nDifferent';
      const result = adapter.cleanResponse(input);
      const lines = result.split('\n').filter((l: string) => l.trim() === 'Same line');
      expect(lines).toHaveLength(1);
    });

    it('removes tool status lines', () => {
      const input = 'Response\n✓ ReadFile some/path\n✗ WriteFile other/path\nMore response';
      const result = adapter.cleanResponse(input);
      expect(result).not.toMatch(/[✓✗]\s+\w+/);
    });
  });

  describe('session management', () => {
    it('starts with no active session', () => {
      expect(adapter.hasSession()).toBe(false);
    });

    it('tracks session state with setHasSession', () => {
      adapter.setHasSession(true);
      expect(adapter.hasSession()).toBe(true);
    });

    it('resets context clears session and interactive flag', () => {
      adapter.setHasSession(true);
      adapter.markInteractiveSessionStarted();
      adapter.resetContext();
      expect(adapter.hasSession()).toBe(false);
    });

    it('markInteractiveSessionStarted affects getPersistentArgs', () => {
      // Before marking, no resume args
      const argsBefore = adapter.getPersistentArgs();
      expect(argsBefore).toHaveLength(0);

      // After marking, should include resume
      adapter.markInteractiveSessionStarted();
      const argsAfter = adapter.getPersistentArgs();
      expect(argsAfter).toContain('--resume');
    });
  });

  describe('getInteractiveCommand', () => {
    it('returns command starting with gemini', () => {
      const cmd = adapter.getInteractiveCommand();
      expect(cmd[0]).toBe('gemini');
    });

    it('includes resume for active sessions', () => {
      adapter.setHasSession(true);
      const cmd = adapter.getInteractiveCommand();
      expect(cmd).toContain('--resume');
    });
  });

  describe('getPersistentArgs', () => {
    it('returns empty array when no session', () => {
      const args = adapter.getPersistentArgs();
      expect(args).toHaveLength(0);
    });

    it('returns resume args when session active', () => {
      adapter.setHasSession(true);
      const args = adapter.getPersistentArgs();
      expect(args).toContain('--resume');
      expect(args).toContain('latest');
    });
  });
});
