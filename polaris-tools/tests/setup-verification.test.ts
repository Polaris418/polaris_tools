/**
 * Setup Verification Test
 * Verifies that all required dependencies for user-profile-page are installed correctly
 */

import { describe, test, expect } from 'vitest';
import { createAvatar } from '@dicebear/core';
import { lorelei, avataaars, bottts } from '@dicebear/collection';
import * as fc from 'fast-check';

describe('Dependency Installation Verification', () => {
  test('DiceBear core should be importable', () => {
    expect(createAvatar).toBeDefined();
    expect(typeof createAvatar).toBe('function');
  });

  test('DiceBear collection styles should be importable', () => {
    expect(lorelei).toBeDefined();
    expect(avataaars).toBeDefined();
    expect(bottts).toBeDefined();
  });

  test('DiceBear should generate avatar SVG', () => {
    const avatar = createAvatar(lorelei, {
      seed: 'test-user',
      size: 128,
    });
    
    const svg = avatar.toString();
    expect(svg).toBeTruthy();
    expect(svg).toContain('<svg');
    expect(svg).toContain('</svg>');
  });

  test('fast-check should be importable', () => {
    expect(fc).toBeDefined();
    expect(fc.assert).toBeDefined();
    expect(fc.property).toBeDefined();
  });

  test('fast-check should work with basic property test', () => {
    fc.assert(
      fc.property(
        fc.string(),
        (str) => {
          return str.length >= 0;
        }
      ),
      { numRuns: 10 }
    );
  });

  test('DiceBear should generate deterministic avatars', () => {
    const avatar1 = createAvatar(lorelei, {
      seed: 'deterministic-test',
      size: 128,
    });
    
    const avatar2 = createAvatar(lorelei, {
      seed: 'deterministic-test',
      size: 128,
    });
    
    expect(avatar1.toString()).toBe(avatar2.toString());
  });
});
