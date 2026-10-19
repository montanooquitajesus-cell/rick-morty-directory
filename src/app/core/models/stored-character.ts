import { Character, CharacterPage, CharacterStatus } from './character';
import { Episode } from './episode';
import { Location } from './location';

export interface StoredEpisode {
  id: number;
  name: string;
  code: string;
  airDate: string;
}

export interface StoredCharacter {
  id: number;
  name: string;
  status: CharacterStatus;
  species: string;
  type: string;
  gender: string;
  originName: string;
  locationName: string;
  locationType: string;
  locationDimension: string;
  residentCount: number;
  image: string;
  episodes: StoredEpisode[];
}

export interface CatalogDetail {
  character: Character;
  episodes: Episode[];
  location: Location | null;
  previousId: number | null;
  nextId: number | null;
}

export function toCharacter(stored: StoredCharacter): Character {
  return {
    id: stored.id,
    name: stored.name,
    status: stored.status,
    species: stored.species,
    type: stored.type,
    gender: stored.gender,
    origin: { name: stored.originName, url: '' },
    location: { name: stored.locationName, url: '' },
    image: stored.image,
    episode: stored.episodes.map((episode) => String(episode.id)),
    url: '',
    created: '',
  };
}

export function toEpisodes(stored: StoredCharacter): Episode[] {
  return stored.episodes.map((episode) => ({
    id: episode.id,
    name: episode.name,
    air_date: episode.airDate,
    episode: episode.code,
    characters: [],
    url: '',
    created: '',
  }));
}

export function toLocation(stored: StoredCharacter): Location | null {
  if (!stored.locationName || stored.locationName.toLowerCase() === 'unknown') return null;

  return {
    id: stored.id,
    name: stored.locationName,
    type: stored.locationType,
    dimension: stored.locationDimension,
    residents: Array.from({ length: stored.residentCount }, () => ''),
    url: '',
    created: '',
  };
}

export function toCharacterPage(characters: readonly StoredCharacter[], page: number): CharacterPage {
  const pageSize = 20;
  const count = characters.length;
  const pages = count === 0 ? 0 : Math.ceil(count / pageSize);
  const safePage = pages === 0 ? 1 : Math.min(page, pages);
  const start = (safePage - 1) * pageSize;

  return {
    info: { count, pages, next: null, prev: null },
    results: characters.slice(start, start + pageSize).map(toCharacter),
  };
}
