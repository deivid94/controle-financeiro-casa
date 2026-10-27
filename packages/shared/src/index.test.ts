import { describe, expect, it } from 'vitest';
import { VERSION } from './index.js';

describe('@casa/shared', () => {
  it('exporta a versão', () => {
    expect(VERSION).toBe('0.1.0');
  });
});
