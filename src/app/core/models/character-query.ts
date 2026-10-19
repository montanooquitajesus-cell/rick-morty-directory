import { ParamMap } from '@angular/router';
import { CharacterStatus } from './character';
import { isKnownSpecies } from './labels';

export interface CharacterQuery {
  name: string;
  status: '' | CharacterStatus;
  species: string;
  page: number;
}

const STATUSES = new Set<CharacterStatus>(['Alive', 'Dead', 'unknown']);

export function sanitizeNameQuery(value: string): string {
  return value.replace(/[^\p{L}\p{N}\s.'-]/gu, '');
}

export function characterQueryFromParams(params: ParamMap): CharacterQuery {
  const status = params.get('status') ?? '';
  const species = params.get('species') ?? '';
  const page = Number(params.get('page') ?? '1');

  return {
    name: sanitizeNameQuery(params.get('name') ?? '').trim(),
    status: isCharacterStatus(status) ? status : '',
    species: isKnownSpecies(species) ? species : '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function isCharacterStatus(value: string): value is CharacterStatus {
  return STATUSES.has(value as CharacterStatus);
}
