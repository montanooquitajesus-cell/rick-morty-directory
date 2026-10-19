import { convertToParamMap } from '@angular/router';
import { characterQueryFromParams, sanitizeNameQuery } from './character-query';

describe('characterQueryFromParams', () => {
  it('uses defaults when the query is empty', () => {
    expect(characterQueryFromParams(convertToParamMap({}))).toEqual({
      name: '',
      status: '',
      species: '',
      page: 1,
    });
  });

  it('reads filters and ignores invalid status or page', () => {
    expect(characterQueryFromParams(convertToParamMap({
      name: '  Rick  ',
      status: 'Alive',
      species: 'Human',
      page: '3',
    }))).toEqual({
      name: 'Rick',
      status: 'Alive',
      species: 'Human',
      page: 3,
    });

    expect(characterQueryFromParams(convertToParamMap({
      status: 'asleep',
      page: '0',
    }))).toEqual({
      name: '',
      status: '',
      species: '',
      page: 1,
    });
  });

  it('drops symbols from the name and ignores an unknown species', () => {
    expect(sanitizeNameQuery("Beth's <script>; DROP")).toBe("Beth's script DROP");
    expect(characterQueryFromParams(convertToParamMap({
      name: "Rick';--",
      species: "Human' OR 1=1",
    }))).toEqual({
      name: "Rick'--",
      status: '',
      species: '',
      page: 1,
    });
  });
});
