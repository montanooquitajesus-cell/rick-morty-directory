export type CharacterStatus = 'Alive' | 'Dead' | 'unknown';

export interface NamedLink {
  name: string;
  url: string;
}

export interface Character {
  id: number;
  name: string;
  status: CharacterStatus;
  species: string;
  type: string;
  gender: string;
  origin: NamedLink;
  location: NamedLink;
  image: string;
  episode: string[];
  url: string;
  created: string;
}

export interface PageInfo {
  count: number;
  pages: number;
  next: string | null;
  prev: string | null;
}

export interface CharacterPage {
  info: PageInfo;
  results: Character[];
}

export const EMPTY_CHARACTER_PAGE: CharacterPage = {
  info: { count: 0, pages: 0, next: null, prev: null },
  results: [],
};
