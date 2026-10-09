import { describe, expect, it } from 'vitest';
import { assertReleaseBranch, assertVersion, setPackageVersion } from './release';

describe('assertVersion', () => {
  it.each(['0.1.0', '1.2.3', '2.0.0-rc.1'])('accepts %s', (version) => {
    expect(assertVersion(version)).toBe(version);
  });

  it.each([undefined, '', 'v1.0.0', '1.0', '01.0.0', '1.0.0 --force'])('rejects %s', (version) => {
    expect(() => assertVersion(version)).toThrow(/Usage/);
  });
});

describe('assertReleaseBranch', () => {
  it('accepts the matching release branch only', () => {
    expect(() => assertReleaseBranch('release/v0.1.0', '0.1.0')).not.toThrow();
    expect(() => assertReleaseBranch('develop', '0.1.0')).toThrow(/release\/v0.1.0/);
    expect(() => assertReleaseBranch('release/v0.2.0', '0.1.0')).toThrow();
  });
});

describe('setPackageVersion', () => {
  it('replaces only the version field', () => {
    const source = '{\n  "name": "x",\n  "version": "0.0.0",\n  "scripts": { "v": "1" }\n}\n';
    expect(setPackageVersion(source, '0.1.0')).toBe(
      '{\n  "name": "x",\n  "version": "0.1.0",\n  "scripts": { "v": "1" }\n}\n',
    );
  });

  it('fails without a version field', () => {
    expect(() => setPackageVersion('{}', '0.1.0')).toThrow(/no version/);
  });
});
