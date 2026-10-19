import { resourceId } from './resource-id';

describe('resourceId', () => {
  it('reads the numeric id at the end of an API url', () => {
    expect(resourceId('https://rickandmortyapi.com/api/location/3')).toBe(3);
    expect(resourceId('https://rickandmortyapi.com/api/episode/12')).toBe(12);
  });

  it('returns null when the url has no id', () => {
    expect(resourceId('')).toBeNull();
    expect(resourceId('https://rickandmortyapi.com/api/location')).toBeNull();
  });
});
