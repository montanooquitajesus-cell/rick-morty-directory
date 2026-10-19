import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { Character } from '../../../core/models/character';
import { CatalogService } from '../../../core/services/catalog';
import { FavoritesState } from '../../../core/state/favorites-state';
import { CharacterCard } from '../../../shared/character-card/character-card';

type FavoritesView = 'loading' | 'ready' | 'empty' | 'missing' | 'error';

@Component({
  selector: 'app-favorite-list',
  imports: [RouterLink, CharacterCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './favorite-list.html',
})
export class FavoriteList {
  protected readonly favoriteState = inject(FavoritesState);
  protected readonly characters = signal<Character[]>([]);
  protected readonly viewStatus = signal<FavoritesView>('loading');

  private readonly catalog = inject(CatalogService);
  private readonly title = inject(Title);

  constructor() {
    this.title.setTitle('Favoritos | Directorio Rick y Morty');
    void this.favoriteState.load();

    effect(() => {
      if (!this.favoriteState.hasLoaded()) return;

      const ids = [...this.favoriteState.ids()]
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0);
      untracked(() => {
        void this.load(ids);
      });
    });
  }

  protected reload(): void {
    const ids = [...this.favoriteState.ids()]
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0);
    void this.load(ids);
  }

  private async load(ids: number[]): Promise<void> {
    if (ids.length === 0) {
      this.characters.set([]);
      this.viewStatus.set('empty');
      return;
    }

    this.viewStatus.set('loading');
    try {
      const characters = await this.catalog.getByIds(ids);
      this.characters.set(characters);
      this.viewStatus.set(characters.length === 0 ? 'missing' : 'ready');
    } catch {
      this.viewStatus.set('error');
    }
  }
}
