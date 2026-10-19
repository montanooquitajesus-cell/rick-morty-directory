import { initializeApp } from 'firebase/app';
import { doc, getFirestore, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyDF5mNX7_ZyVejfP4_5mBWZw7JEJqJSYk4',
  authDomain: 'directorio-rick-and-morty.firebaseapp.com',
  projectId: 'directorio-rick-and-morty',
  storageBucket: 'directorio-rick-and-morty.firebasestorage.app',
  messagingSenderId: '814466310932',
  appId: '1:814466310932:web:02e9fc3ac1bda292099801',
};

const API_URL = 'https://rickandmortyapi.com/api';
const PAGE_SIZE = 20;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const locationCache = new Map();

async function readJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`No se pudo leer ${url} (${response.status})`);
  return response.json();
}

function resourceId(url) {
  const match = /\/(\d+)$/.exec(url ?? '');
  return match ? Number(match[1]) : null;
}

async function readEpisodes(urls) {
  const ids = urls.map(resourceId).filter((id) => Number.isInteger(id));
  if (ids.length === 0) return [];

  const payload = await readJson(`${API_URL}/episode/${ids.join(',')}`);
  const episodes = Array.isArray(payload) ? payload : [payload];
  return episodes.map((episode) => ({
    id: episode.id,
    name: episode.name,
    code: episode.episode,
    airDate: episode.air_date,
  }));
}

async function readLocation(url) {
  const id = resourceId(url);
  if (id === null) return null;
  if (locationCache.has(id)) return locationCache.get(id);

  const location = await readJson(`${API_URL}/location/${id}`);
  locationCache.set(id, location);
  return location;
}

function toStoredCharacter(character, episodes, location) {
  return {
    id: character.id,
    name: character.name,
    status: character.status,
    species: character.species,
    type: character.type ?? '',
    gender: character.gender,
    originName: character.origin?.name ?? '',
    locationName: location?.name ?? character.location?.name ?? '',
    locationType: location?.type ?? '',
    locationDimension: location?.dimension ?? '',
    residentCount: location?.residents?.length ?? 0,
    image: character.image,
    episodes,
  };
}

const page = await readJson(`${API_URL}/character?page=1`);
const characters = page.results.slice(0, PAGE_SIZE);
const stored = [];

for (const character of characters) {
  const [episodes, location] = await Promise.all([
    readEpisodes(character.episode ?? []),
    readLocation(character.location?.url),
  ]);
  stored.push(toStoredCharacter(character, episodes, location));
  console.log(`Preparado ${character.id} ${character.name}`);
}

const batch = writeBatch(db);
for (const character of stored) {
  batch.set(doc(db, 'characters', String(character.id)), character);
}
await batch.commit();
console.log(`Guardados ${stored.length} personajes en Firestore.`);
process.exit(0);
