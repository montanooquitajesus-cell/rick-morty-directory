import { Injectable, inject } from '@angular/core';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  setDoc,
} from 'firebase/firestore';
import { FirebaseService } from './firebase';

@Injectable({ providedIn: 'root' })
export class FavoritesService {
  private readonly firebase = inject(FirebaseService);
  private readonly favoritesCollection = collection(
    this.firebase.db,
    'favorites',
  );

  async getAll(): Promise<string[]> {
    const snapshot = await getDocs(this.favoritesCollection);
    return snapshot.docs.map((item) => item.id);
  }

  async add(characterId: string): Promise<void> {
    await setDoc(doc(this.favoritesCollection, characterId), {
      characterId,
      createdAt: Date.now(),
    });
  }

  async remove(characterId: string): Promise<void> {
    await deleteDoc(doc(this.favoritesCollection, characterId));
  }

  async toggle(characterId: string, isFavorite: boolean): Promise<void> {
    if (isFavorite) {
      await this.remove(characterId);
      return;
    }

    await this.add(characterId);
  }
}