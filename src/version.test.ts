import { describe, it, expect, vi, afterEach } from 'vitest';
import { VERSION, PACKAGE_NAME, checkForUpdates } from './version.js';

describe('version', () => {
  describe('constants', () => {
    it('exports a VERSION string', () => {
      expect(VERSION).toBeDefined();
      expect(typeof VERSION).toBe('string');
      // Should look like semver
      expect(VERSION).toMatch(/^\d+\.\d+\.\d+/);
    });

    it('exports a PACKAGE_NAME string', () => {
      expect(PACKAGE_NAME).toBeDefined();
      expect(typeof PACKAGE_NAME).toBe('string');
      expect(PACKAGE_NAME.length).toBeGreaterThan(0);
    });
  });

  describe('checkForUpdates', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('detects when update is available', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: '999.0.0' }),
      });

      const result = await checkForUpdates();

      expect(result).not.toBeNull();
      expect(result!.updateAvailable).toBe(true);
      expect(result!.currentVersion).toBe(VERSION);
      expect(result!.latestVersion).toBe('999.0.0');
    });

    it('detects when no update is available', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ version: '0.0.1' }),
      });

      const result = await checkForUpdates();

      expect(result).not.toBeNull();
      expect(result!.updateAvailable).toBe(false);
    });

    it('returns null on network error', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const result = await checkForUpdates();

      expect(result).toBeNull();
    });

    it('returns null on non-ok response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
      });

      const result = await checkForUpdates();

      expect(result).toBeNull();
    });

    it('returns null when version field missing from response', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      });

      const result = await checkForUpdates();

      expect(result).toBeNull();
    });
  });
});
