import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import {
  Subject,
  catchError,
  forkJoin,
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
import { genderLabel, placeLabel, speciesLabel, statusLabel } from '../../../core/models/labels';
import { RickMortyService } from '../../../core/services/rick-morty';
import { FavoritesState } from '../../../core/state/favorites-state';
import { isNotFound } from '../../../core/utils/http-errors';
import { resourceId } from '../../../core/utils/resource-id';
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

  protected readonly viewStatus = signal<DetailView>('loading');
  protected readonly errorMessage = signal('');
  protected readonly character = signal<Character | null>(null);
  protected readonly episodes = signal<Episode[]>([]);
  protected readonly location = signal<Location | null>(null);
  protected readonly episodesMissing = signal(false);

  private readonly api = inject(RickMortyService);
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

  private loadDetail(id: number) {
    if (!Number.isInteger(id) || id < 1) {
      return of({ kind: 'error' as const, message: 'El identificador del personaje no es válido.' });
    }

    return this.api.getCharacter(id).pipe(
      switchMap((character) => this.loadRelations(character)),
      catchError((error: unknown) => of({
        kind: 'error' as const,
        message: isNotFound(error)
          ? 'No encontramos ese personaje.'
          : 'No se pudo cargar el personaje. Revisa tu conexión e inténtalo de nuevo.',
      })),
    );
  }

  private loadRelations(character: Character) {
    const episodeIds = character.episode
      .map((url) => resourceId(url))
      .filter((episodeId): episodeId is number => episodeId !== null);
    const locationId = resourceId(character.location.url);

    return forkJoin({
      episodes: this.api.getEpisodes(episodeIds).pipe(
        map((episodes) => ({ episodes, failed: false })),
        catchError(() => of({ episodes: [] as Episode[], failed: episodeIds.length > 0 })),
      ),
      location: locationId === null
        ? of(null)
        : this.api.getLocation(locationId).pipe(catchError(() => of(null))),
    }).pipe(
      map(({ episodes, location }) => ({
        kind: 'ready' as const,
        character,
        episodes: episodes.episodes,
        episodesMissing: episodes.failed,
        location,
      })),
    );
  }
}
