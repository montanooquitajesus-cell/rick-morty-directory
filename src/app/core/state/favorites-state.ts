import { Injectable, inject, signal } from '@angular/core';
import { FavoritesService } from '../services/favorites';

@Injectable({ providedIn: 'root' })
export class FavoritesState {
  private readonly favorites = inject(FavoritesService);
  private loadPromise: Promise<void> | null = null;

  readonly ids = signal<ReadonlySet<string>>(new Set());
  readonly pendingIds = signal<ReadonlySet<string>>(new Set());
  readonly hasLoadError = signal(false);
  readonly toggleError = signal('');

  load(): Promise<void> {
    this.loadPromise ??= this.fetchIds();
    return this.loadPromise;
  }

  retry(): Promise<void> {
    this.loadPromise = null;
    this.hasLoadError.set(false);
    return this.load();
  }

  isFavorite(characterId: number): boolean {
    return this.ids().has(String(characterId));
  }

  isPending(characterId: number): boolean {
    return this.pendingIds().has(String(characterId));
  }

  async toggle(characterId: number): Promise<void> {
    const key = String(characterId);
    if (this.pendingIds().has(key)) return;

    const wasFavorite = this.ids().has(key);
    this.toggleError.set('');
    this.pendingIds.update((current) => addToSet(current, key));

    try {
      await this.favorites.toggle(key, wasFavorite);
      this.ids.update((current) =>
        wasFavorite ? removeFromSet(current, key) : addToSet(current, key),
      );
    } catch {
      this.toggleError.set('No se pudo actualizar el favorito. Inténtalo de nuevo.');
    } finally {
      this.pendingIds.update((current) => removeFromSet(current, key));
    }
  }

  private async fetchIds(): Promise<void> {
    try {
      const ids = await this.favorites.getAll();
      this.ids.set(new Set(ids));
      this.hasLoadError.set(false);
    } catch {
      this.hasLoadError.set(true);
      this.loadPromise = null;
    }
  }
}

function addToSet(current: ReadonlySet<string>, value: string): ReadonlySet<string> {
  const next = new Set(current);
  next.add(value);
  return next;
}

function removeFromSet(current: ReadonlySet<string>, value: string): ReadonlySet<string> {
  const next = new Set(current);
  next.delete(value);
  return next;
}
