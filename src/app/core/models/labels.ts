import { CharacterStatus } from './character';

export const STATUS_OPTIONS: readonly { value: CharacterStatus; label: string }[] = [
  { value: 'Alive', label: 'Vivo' },
  { value: 'Dead', label: 'Muerto' },
  { value: 'unknown', label: 'Desconocido' },
];

export const SPECIES_OPTIONS: readonly { value: string; label: string }[] = [
  { value: 'Human', label: 'Humano' },
  { value: 'Alien', label: 'Alien' },
  { value: 'Humanoid', label: 'Humanoide' },
  { value: 'Animal', label: 'Animal' },
  { value: 'Robot', label: 'Robot' },
  { value: 'Cronenberg', label: 'Cronenberg' },
  { value: 'Disease', label: 'Enfermedad' },
  { value: 'Mythological Creature', label: 'Criatura mitológica' },
  { value: 'Poopybutthole', label: 'Poopybutthole' },
  { value: 'unknown', label: 'Desconocido' },
];

const STATUS_LABELS = Object.fromEntries(
  STATUS_OPTIONS.map((option) => [option.value, option.label]),
);

const SPECIES_LABELS = Object.fromEntries(
  SPECIES_OPTIONS.map((option) => [option.value, option.label]),
);

const GENDER_LABELS: Record<string, string> = {
  Female: 'Mujer',
  Male: 'Hombre',
  Genderless: 'Sin género',
  unknown: 'Desconocido',
};

export function statusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function speciesLabel(species: string): string {
  return SPECIES_LABELS[species] ?? species;
}

export function genderLabel(gender: string): string {
  return GENDER_LABELS[gender] ?? gender;
}

export function placeLabel(name: string): string {
  return name.toLowerCase() === 'unknown' ? 'Desconocido' : name;
}

export function formatAirDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function isKnownSpecies(species: string): boolean {
  return SPECIES_OPTIONS.some((option) => option.value === species);
}
