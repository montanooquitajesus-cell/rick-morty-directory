import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
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
import { CharacterPage } from '../../../core/models/character';
import { CharacterQuery, characterQueryFromParams } from '../../../core/models/character-query';
import { SPECIES_OPTIONS, STATUS_OPTIONS, isKnownSpecies } from '../../../core/models/labels';
import { CatalogService } from '../../../core/services/catalog';
import { FavoritesState } from '../../../core/state/favorites-state';
import { CharacterCard } from '../../../shared/character-card/character-card';

type ListView = 'loading' | 'ready' | 'empty' | 'error';

@Component({
  selector: 'app-character-list',
  imports: [CharacterCard],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './character-list.html',
})
export class CharacterList {
  protected readonly favoriteState = inject(FavoritesState);
  protected readonly statusOptions = STATUS_OPTIONS;
  protected readonly speciesOptions = SPECIES_OPTIONS;
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
  protected readonly layout = signal<'grid' | 'list'>('grid');

  private readonly catalog = inject(CatalogService);
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
        switchMap((query) => from(this.catalog.query(query)).pipe(
          map((page): ListResult => ({ kind: 'page', page })),
          catchError((error: unknown): Observable<ListResult> => of({ kind: 'error', error })),
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
    if (page < 1 || page > total || page === this.filters().page) return;
    this.queueQuery({ page });
  }

  protected setLayout(layout: 'grid' | 'list'): void {
    this.layout.set(layout);
  }

  protected pageItems(): Array<number | 'gap'> {
    const total = this.pageData()?.info.pages ?? 1;
    const current = this.filters().page;
    if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1);

    const items: Array<number | 'gap'> = [1];
    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);
    if (start > 2) items.push('gap');
    for (let page = start; page <= end; page += 1) items.push(page);
    if (end < total - 1) items.push('gap');
    items.push(total);
    return items;
  }

  protected rangeStart(): number {
    const count = this.pageData()?.results.length ?? 0;
    if (count === 0) return 0;
    return (this.filters().page - 1) * 20 + 1;
  }

  protected rangeEnd(): number {
    return this.rangeStart() + (this.pageData()?.results.length ?? 1) - 1;
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
