import { Injectable, inject } from '@angular/core';
import { collection, getDocs } from 'firebase/firestore';
import { Character, CharacterPage } from '../models/character';
import {
  CatalogDetail,
  StoredCharacter,
  toCharacter,
  toCharacterPage,
  toEpisodes,
  toLocation,
} from '../models/stored-character';
import { CharacterQuery } from '../models/character-query';
import { FirebaseService } from './firebase';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private readonly firebase = inject(FirebaseService);
  private loadPromise: Promise<StoredCharacter[]> | null = null;

  async query(filters: CharacterQuery): Promise<CharacterPage> {
    const characters = await this.loadAll();
    const name = filters.name.toLowerCase();
    const filtered = characters.filter((character) => {
      if (name && !character.name.toLowerCase().includes(name)) return false;
      if (filters.status && character.status !== filters.status) return false;
      if (filters.species && character.species !== filters.species) return false;
      return true;
    });

    return toCharacterPage(filtered);
  }

  async getDetail(id: number): Promise<CatalogDetail | null> {
    const characters = await this.loadAll();
    const index = characters.findIndex((character) => character.id === id);
    if (index < 0) return null;

    const current = characters[index];
    return {
      character: toCharacter(current),
      episodes: toEpisodes(current),
      location: toLocation(current),
      previousId: index > 0 ? characters[index - 1].id : null,
      nextId: index < characters.length - 1 ? characters[index + 1].id : null,
    };
  }

  async getByIds(ids: readonly number[]): Promise<Character[]> {
    const wanted = new Set(ids);
    const characters = await this.loadAll();
    return characters.filter((character) => wanted.has(character.id)).map(toCharacter);
  }

  private loadAll(): Promise<StoredCharacter[]> {
    this.loadPromise ??= this.fetchAll();
    return this.loadPromise;
  }

  private async fetchAll(): Promise<StoredCharacter[]> {
    const snapshot = await getDocs(collection(this.firebase.db, 'characters'));
    return snapshot.docs
      .map((item) => item.data() as StoredCharacter)
      .sort((left, right) => left.id - right.id);
  }
}
