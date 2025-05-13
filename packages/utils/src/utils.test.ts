import { isServer } from './utils.ts';

describe('utils', () => {
  it('should return true for isServer', () => {
    expect(isServer()).toBe(true);
  });
});
