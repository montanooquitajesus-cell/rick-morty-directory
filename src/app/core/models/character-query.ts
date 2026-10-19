import { ParamMap } from '@angular/router';
import { CharacterStatus } from './character';

export interface CharacterQuery {
  name: string;
  status: '' | CharacterStatus;
  species: string;
  page: number;
}

const STATUSES = new Set<CharacterStatus>(['Alive', 'Dead', 'unknown']);

export function characterQueryFromParams(params: ParamMap): CharacterQuery {
  const status = params.get('status') ?? '';
  const page = Number(params.get('page') ?? '1');

  return {
    name: (params.get('name') ?? '').trim(),
    status: isCharacterStatus(status) ? status : '',
    species: params.get('species') ?? '',
    page: Number.isInteger(page) && page > 0 ? page : 1,
  };
}

function isCharacterStatus(value: string): value is CharacterStatus {
  return STATUSES.has(value as CharacterStatus);
}
