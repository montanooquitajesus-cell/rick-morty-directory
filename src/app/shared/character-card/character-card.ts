import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Character } from '../../core/models/character';
import { placeLabel, speciesLabel, statusLabel } from '../../core/models/labels';
import { FavoritesState } from '../../core/state/favorites-state';
import { FavoriteButton } from '../favorite-button/favorite-button';

@Component({
  selector: 'app-character-card',
  imports: [RouterLink, FavoriteButton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './character-card.html',
})
export class CharacterCard {
  readonly character = input.required<Character>();

  protected readonly favorites = inject(FavoritesState);
  protected readonly statusLabel = statusLabel;
  protected readonly speciesLabel = speciesLabel;
  protected readonly placeLabel = placeLabel;
}
