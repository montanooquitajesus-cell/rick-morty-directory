import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { Character, CharacterPage } from '../models/character';
import { CharacterQuery } from '../models/character-query';
import { Episode } from '../models/episode';
import { Location } from '../models/location';

const API_URL = 'https://rickandmortyapi.com/api';

@Injectable({ providedIn: 'root' })
export class RickMortyService {
  private readonly http = inject(HttpClient);

  getCharacters(query: CharacterQuery): Observable<CharacterPage> {
    let params = new HttpParams();
    if (query.name) params = params.set('name', query.name);
    if (query.status) params = params.set('status', query.status);
    if (query.species) params = params.set('species', query.species);
    if (query.page > 1) params = params.set('page', String(query.page));

    return this.http.get<CharacterPage>(`${API_URL}/character`, { params });
  }

  getCharacter(id: number): Observable<Character> {
    return this.http.get<Character>(`${API_URL}/character/${id}`);
  }

  getEpisodes(ids: readonly number[]): Observable<Episode[]> {
    if (ids.length === 0) return of([]);

    return this.http
      .get<Episode | Episode[]>(`${API_URL}/episode/${ids.join(',')}`)
      .pipe(map((result) => (Array.isArray(result) ? result : [result])));
  }

  getLocation(id: number): Observable<Location> {
    return this.http.get<Location>(`${API_URL}/location/${id}`);
  }
}
