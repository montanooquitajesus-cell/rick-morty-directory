import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  from,
  map,
  merge,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { Character } from '../../../core/models/character';
import { Episode } from '../../../core/models/episode';
import { Location } from '../../../core/models/location';
import { formatAirDate, genderLabel, placeLabel, speciesLabel, statusLabel } from '../../../core/models/labels';
import { CatalogService } from '../../../core/services/catalog';
import { FavoritesState } from '../../../core/state/favorites-state';
import { FavoriteButton } from '../../../shared/favorite-button/favorite-button';

type DetailView = 'loading' | 'ready' | 'error';

@Component({
  selector: 'app-character-detail',
  imports: [RouterLink, FavoriteButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './character-detail.html',
})
export class CharacterDetail {
  protected readonly favoriteState = inject(FavoritesState);
  protected readonly statusLabel = statusLabel;
  protected readonly speciesLabel = speciesLabel;
  protected readonly genderLabel = genderLabel;
  protected readonly placeLabel = placeLabel;
  protected readonly formatAirDate = formatAirDate;
  protected readonly showAllEpisodes = signal(false);
  protected readonly copied = signal(false);
  protected readonly previousId = signal<number | null>(null);
  protected readonly nextId = signal<number | null>(null);

  protected readonly viewStatus = signal<DetailView>('loading');
  protected readonly errorMessage = signal('');
  protected readonly character = signal<Character | null>(null);
  protected readonly episodes = signal<Episode[]>([]);
  protected readonly location = signal<Location | null>(null);
  protected readonly episodesMissing = signal(false);

  private readonly catalog = inject(CatalogService);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly reload$ = new Subject<void>();

  constructor() {
    void this.favoriteState.load();

    merge(
      this.route.paramMap,
      this.reload$.pipe(switchMap(() => this.route.paramMap.pipe(take(1)))),
    )
      .pipe(
        map((params) => Number(params.get('id'))),
        tap(() => {
          this.viewStatus.set('loading');
          this.character.set(null);
          this.episodes.set([]);
          this.location.set(null);
          this.episodesMissing.set(false);
          this.showAllEpisodes.set(false);
          this.copied.set(false);
          this.previousId.set(null);
          this.nextId.set(null);
          this.errorMessage.set('');
        }),
        switchMap((id) => this.loadDetail(id)),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.kind === 'error') {
          this.viewStatus.set('error');
          this.errorMessage.set(result.message);
          this.title.setTitle('Personaje | Directorio Rick y Morty');
          return;
        }

        this.character.set(result.character);
        this.episodes.set(result.episodes);
        this.location.set(result.location);
        this.previousId.set(result.previousId);
        this.nextId.set(result.nextId);
        this.episodesMissing.set(result.episodesMissing);
        this.viewStatus.set('ready');
        this.title.setTitle(`${result.character.name} | Directorio Rick y Morty`);
      });
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected retryFavorites(): void {
    void this.favoriteState.retry();
  }

  protected visibleEpisodes(): Episode[] {
    const episodes = this.episodes();
    return this.showAllEpisodes() ? episodes : episodes.slice(0, 5);
  }

  protected characterCode(id: number): string {
    return String(id).padStart(3, '0');
  }

  protected summary(character: Character): string {
    const appearances = character.episode.length;
    const episodeText = appearances === 1 ? '1 episodio' : `${appearances} episodios`;
    return `Ubicación registrada: ${placeLabel(character.location.name)}. Aparece en ${episodeText}.`;
  }

  protected async share(character: Character): Promise<void> {
    const url = `${location.origin}/characters/${character.id}`;
    this.copied.set(false);

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: character.name, url });
        return;
      } catch {
        return;
      }
    }

    await navigator.clipboard.writeText(url);
    this.copied.set(true);
  }

  private loadDetail(id: number) {
    if (!Number.isInteger(id) || id < 1) {
      return of({ kind: 'error' as const, message: 'El identificador del personaje no es válido.' });
    }

    return from(this.catalog.getDetail(id)).pipe(
      map((detail) => {
        if (!detail) {
          return { kind: 'error' as const, message: 'No encontramos ese personaje en el catálogo.' };
        }

        return {
          kind: 'ready' as const,
          character: detail.character,
          episodes: detail.episodes,
          episodesMissing: false,
          location: detail.location,
          previousId: detail.previousId,
          nextId: detail.nextId,
        };
      }),
      catchError(() => of({
        kind: 'error' as const,
        message: 'No se pudo cargar el personaje desde Firestore. Revisa tu conexión e inténtalo de nuevo.',
      })),
    );
  }
}
