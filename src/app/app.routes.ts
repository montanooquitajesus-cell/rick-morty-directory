import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/characters/character-list/character-list').then(
        (module) => module.CharacterList,
      ),
  },
  {
    path: 'favorites',
    loadComponent: () =>
      import('./features/characters/favorite-list/favorite-list').then(
        (module) => module.FavoriteList,
      ),
  },
  {
    path: 'characters/:id',
    loadComponent: () =>
      import('./features/characters/character-detail/character-detail').then(
        (module) => module.CharacterDetail,
      ),
  },
  { path: '**', redirectTo: '' },
];
