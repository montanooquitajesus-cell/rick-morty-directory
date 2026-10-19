import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-favorite-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './favorite-button.html',
})
export class FavoriteButton {
  readonly isFavorite = input(false);
  readonly isPending = input(false);
  readonly characterName = input.required<string>();
  readonly toggleFavorite = output<void>();

  protected readonly label = computed(() => {
    const name = this.characterName();
    if (this.isPending()) return `Actualizando favorito de ${name}`;
    return this.isFavorite()
      ? `Quitar a ${name} de favoritos`
      : `Guardar a ${name} en favoritos`;
  });

  protected onClick(): void {
    this.toggleFavorite.emit();
  }
}
