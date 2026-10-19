import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Observable,
  Subject,
  catchError,
  concatMap,
  debounceTime,
  distinctUntilChanged,
  from,
  map,
  merge,
  of,
  switchMap,
  take,
  tap,
} from 'rxjs';
import { CharacterPage, EMPTY_CHARACTER_PAGE } from '../../../core/models/character';
import { CharacterQuery, characterQueryFromParams } from '../../../core/models/character-query';
import {
  SPECIES_OPTIONS,
  STATUS_OPTIONS,
  isKnownSpecies,
  placeLabel,
  speciesLabel,
  statusLabel,
} from '../../../core/models/labels';
import { RickMortyService } from '../../../core/services/rick-morty';
import { FavoritesState } from '../../../core/state/favorites-state';
import { isNotFound } from '../../../core/utils/http-errors';
import { FavoriteButton } from '../../../shared/favorite-button/favorite-button';

type ListView = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-character-list',
  imports: [RouterLink, FavoriteButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './character-list.html',
})
export class CharacterList {
  protected readonly favoriteState = inject(FavoritesState);
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly speciesOptions = SPECIES_OPTIONS;
  protected readonly statusLabel = statusLabel;
  protected readonly speciesLabel = speciesLabel;
  protected readonly placeLabel = placeLabel;
  protected readonly isKnownSpecies = isKnownSpecies;

  protected readonly nameDraft = signal('');
  protected readonly filters = signal<CharacterQuery>({
    name: '',
    status: '',
    species: '',
    page: 1,
  });
  protected readonly pageData = signal<CharacterPage | null>(null);
  protected readonly viewStatus = signal<ListView>('loading');
  protected readonly errorMessage = signal('');

  private readonly api = inject(RickMortyService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly title = inject(Title);
  private readonly nameChanges = new Subject<string>();
  private readonly immediateName = new Subject<string>();
  private readonly queryUpdates = new Subject<Partial<CharacterQuery>>();
  private readonly reload$ = new Subject<void>();
  private nameEditInFlight = false;

  constructor() {
    this.title.setTitle('Personajes | Directorio Rick y Morty');
    void this.favoriteState.load();

    merge(
      this.nameChanges.pipe(debounceTime(300)),
      this.immediateName,
    )
      .pipe(distinctUntilChanged(), takeUntilDestroyed())
      .subscribe((name) => this.queueQuery({ name, page: 1 }));

    this.queryUpdates
      .pipe(
        concatMap((patch) => {
          const next = { ...characterQueryFromParams(this.route.snapshot.queryParamMap), ...patch };
          return from(this.router.navigate([], {
            relativeTo: this.route,
            queryParams: {
              name: next.name || null,
              status: next.status || null,
              species: next.species || null,
              page: next.page > 1 ? next.page : null,
            },
          }));
        }),
        takeUntilDestroyed(),
      )
      .subscribe();

    merge(
      this.route.queryParamMap,
      this.reload$.pipe(switchMap(() => this.route.queryParamMap.pipe(take(1)))),
    )
      .pipe(
        map((params) => characterQueryFromParams(params)),
        tap((query) => this.applyQuery(query)),
        switchMap((query) => this.api.getCharacters(query).pipe(
          map((page): ListResult => ({ kind: 'page', page })),
          catchError((error: unknown): Observable<ListResult> => {
            if (isNotFound(error)) return of({ kind: 'page', page: EMPTY_CHARACTER_PAGE });
            return of({ kind: 'error', error });
          }),
        )),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        if (result.kind === 'error') {
          this.pageData.set(null);
          this.viewStatus.set('error');
          this.errorMessage.set(listErrorMessage(result.error));
          return;
        }

        this.pageData.set(result.page);
        this.viewStatus.set(result.page.results.length === 0 ? 'empty' : 'ready');
      });
  }

  protected hasFilters(): boolean {
    const filters = this.filters();
    return filters.name !== '' || filters.status !== '' || filters.species !== '';
  }

  protected onNameInput(event: Event): void {
    const value = event.target instanceof HTMLInputElement ? event.target.value : '';
    this.nameDraft.set(value);
    this.nameEditInFlight = true;
    this.nameChanges.next(value.trim());
  }

  protected onStatusChange(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    const status = value === 'Alive' || value === 'Dead' || value === 'unknown' ? value : '';
    if (status === this.filters().status) return;
    this.queueQuery({ status, page: 1 });
  }

  protected onSpeciesChange(event: Event): void {
    const value = event.target instanceof HTMLSelectElement ? event.target.value : '';
    if (value === this.filters().species) return;
    this.queueQuery({ species: value, page: 1 });
  }

  protected clearFilters(): void {
    this.nameDraft.set('');
    this.nameEditInFlight = false;
    this.nameChanges.next('');
    this.immediateName.next('');
    this.queueQuery({ status: '', species: '', page: 1 });
  }

  protected goToPage(page: number): void {
    const total = this.pageData()?.info.pages ?? 1;
    if (page < 1 || page > total) return;
    this.queueQuery({ page });
  }

  protected reload(): void {
    this.reload$.next();
  }

  protected retryFavorites(): void {
    void this.favoriteState.retry();
  }

  private queueQuery(patch: Partial<CharacterQuery>): void {
    this.queryUpdates.next(patch);
  }

  private applyQuery(query: CharacterQuery): void {
    this.filters.set(query);
    const draft = this.nameDraft().trim();
    if (this.nameEditInFlight) {
      if (draft === query.name) this.nameEditInFlight = false;
    } else {
      this.nameDraft.set(query.name);
    }
    this.viewStatus.set('loading');
    this.errorMessage.set('');
  }
}

type ListResult =
  | { kind: 'page'; page: CharacterPage }
  | { kind: 'error'; error: unknown };

function listErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse && error.status === 0) {
    return 'No hay conexión con el directorio. Revisa tu red e inténtalo de nuevo.';
  }
  return 'No se pudo cargar el directorio. Inténtalo de nuevo.';
}
