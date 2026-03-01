import { describe, it, expect, beforeEach } from 'vitest';
import { ClaudeAdapter } from './claude.js';

describe('ClaudeAdapter', () => {
  let adapter: ClaudeAdapter;

  beforeEach(() => {
    adapter = new ClaudeAdapter();
  });

  describe('properties', () => {
    it('has correct name', () => {
      expect(adapter.name).toBe('claude');
    });

    it('has correct display name', () => {
      expect(adapter.displayName).toBe('Claude Code');
    });

    it('has a color defined', () => {
      expect(adapter.color).toContain('\x1b[');
    });

    it('has a prompt pattern', () => {
      expect(adapter.promptPattern).toBeInstanceOf(RegExp);
    });

    it('has idle timeout set', () => {
      expect(adapter.idleTimeout).toBeGreaterThan(0);
    });

    it('has startup delay set', () => {
      expect(adapter.startupDelay).toBeGreaterThan(0);
    });
  });

  describe('getCommand', () => {
    it('includes -p flag for regular prompts', () => {
      const cmd = adapter.getCommand('hello', { continueSession: false });
      expect(cmd).toContain('-p');
      expect(cmd).toContain('hello');
    });

    it('includes --output-format json for regular prompts', () => {
      const cmd = adapter.getCommand('hello', { continueSession: false });
      expect(cmd).toContain('--output-format');
      expect(cmd).toContain('json');
    });

    it('skips -p flag for slash commands', () => {
      const cmd = adapter.getCommand('/status', { continueSession: false });
      expect(cmd).not.toContain('-p');
    });

    it('starts with claude command', () => {
      const cmd = adapter.getCommand('test', { continueSession: false });
      expect(cmd[0]).toBe('claude');
    });

    it('includes session args when continueSession is true', () => {
      const cmd = adapter.getCommand('hello');
      // Should include --session-id on first call
      expect(cmd).toContain('--session-id');
    });
  });

  describe('cleanResponse', () => {
    it('strips ANSI escape codes', () => {
      const result = adapter.cleanResponse('\x1b[31mHello\x1b[0m World');
      expect(result).not.toContain('\x1b[');
    });

    it('removes spinner frames', () => {
      const result = adapter.cleanResponse('Loading... ');
      expect(result).not.toMatch(/[⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏]/);
    });

    it('removes box drawing characters', () => {
      const input = '╭──────╮\n│ text │\n╰──────╯';
      const result = adapter.cleanResponse(input);
      expect(result).not.toContain('╭');
      expect(result).not.toContain('╯');
    });

    it('removes prompt lines', () => {
      const result = adapter.cleanResponse('Some response\n❯ claude →\n');
      expect(result).not.toContain('❯');
    });

    it('deduplicates consecutive identical lines', () => {
      const input = 'Line 1\nLine 1\nLine 2\nLine 2\nLine 3';
      const result = adapter.cleanResponse(input);
      const lines = result.split('\n').filter((l: string) => l.trim().length > 0);
      // Adjacent duplicates should be removed
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim().length > 0) {
          expect(lines[i].trim()).not.toBe(lines[i - 1].trim());
        }
      }
    });

    it('handles empty input', () => {
      expect(adapter.cleanResponse('')).toBe('');
    });

    it('removes Claude Code version line', () => {
      const result = adapter.cleanResponse('  Claude Code v2.1.0  \nActual content');
      expect(result).not.toContain('Claude Code v');
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

    it('resets context clears session', () => {
      adapter.setHasSession(true);
      adapter.resetContext();
      expect(adapter.hasSession()).toBe(false);
    });

    it('resets session ID on resetContext', () => {
      // First call creates session ID
      adapter.getCommand('hello');
      const sessionId1 = adapter.getSessionId();
      expect(sessionId1).not.toBeNull();

      adapter.resetContext();
      expect(adapter.getSessionId()).toBeNull();

      // New call creates new session ID
      adapter.getCommand('hello');
      const sessionId2 = adapter.getSessionId();
      expect(sessionId2).not.toBe(sessionId1);
    });
  });

  describe('getInteractiveCommand', () => {
    it('returns command starting with claude', () => {
      const cmd = adapter.getInteractiveCommand({ continueSession: false });
      expect(cmd[0]).toBe('claude');
    });

    it('includes session args for continued sessions', () => {
      const cmd = adapter.getInteractiveCommand();
      expect(cmd.length).toBeGreaterThan(1); // claude + session args
    });
  });

  describe('getPersistentArgs', () => {
    it('returns session args', () => {
      const args = adapter.getPersistentArgs();
      expect(args.length).toBeGreaterThan(0);
    });
  });
});
