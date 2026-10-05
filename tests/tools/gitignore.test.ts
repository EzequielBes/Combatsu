/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import gitignore from '../../.gitignore?raw';

describe('.gitignore (FND-19)', () => {
  it('tem a linha exata .env.local', () => {
    const lines = gitignore.split(/\r?\n/).map((l) => l.trim());
    expect(lines).toContain('.env.local');
  });
});
