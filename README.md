# Directorio Rick y Morty

Directorio de personajes para el mini-proyecto de Enacment 2026. La app lista 40 personajes guardados en Cloud Firestore, filtra en el cliente y abre una ficha con ubicación y episodios. El toque elegido es **favoritos**, también persistidos en Firestore. La lista entra con 10 personajes y carga el resto de 10 en 10 al hacer scroll.

Proyecto Firebase: `directorio-rick-and-morty`.

## Checklist de auditoría

- [x] Reto: Directorio Rick y Morty. Alcance y supuestos en la sección siguiente.
- [x] Lista con filtros (nombre, estado, especie), estados de carga, vacío y error.
- [x] Detalle con ubicación, residentes y episodios.
- [x] Toque: favoritos.
- [x] Persistencia: Cloud Firestore (`characters` y `favorites`).
- [x] Reglas de seguridad en `firestore.rules`.
- [x] Arquitectura, modelo de datos, decisiones, rendimiento y accesibilidad.
- [x] Sección Uso de IA.
- [ ] URL pública en Firebase Hosting. El hosting está configurado; el deploy de la app no se ha publicado en esta entrega todavía.

## Alcance y supuestos

El PDF pide lista con filtros, detalle con relaciones y una persistencia (Firestore o localStorage). No exige el catálogo completo de la API pública.

Supuestos de esta entrega:

- El catálogo es propio: 40 personajes (las dos primeras páginas de la API) viven en la colección `characters`. La app no consulta `rickandmortyapi.com` en tiempo de ejecución.
- Esos 40 se cargaron con `scripts/seed-characters.mjs`. Episodios y ubicación quedaron denormalizados en el mismo documento.
- Los retratos no se copiaron a Storage. Cada documento guarda la URL de la imagen y el navegador la pide a ese CDN.
- Favoritos es el toque. La lista usa scroll infinito: primero 10 personajes y después bloques de 10.
- Un favorito cuyo id no esté en el catálogo sigue guardado, pero no tiene ficha.
- No hay cuentas. El directorio es público y las reglas limitan qué se puede escribir.

## Instalación y ejecución

Requiere Node LTS y npm.

```bash
npm install
npm start
```

Abre `http://localhost:4200/`.

```bash
npm test
npm run build
```

El build de producción queda en `dist/rick-morty-directory/browser`, que es la carpeta pública de Hosting.

### Despliegue

Reglas (ya publicadas en el proyecto):

```bash
npx firebase deploy --only firestore:rules --project directorio-rick-and-morty
```

Hosting, cuando se quiera publicar la URL:

```bash
npm run build
npx firebase deploy --only hosting --project directorio-rick-and-morty
```

Para volver a sembrar el catálogo hay que abrir temporalmente `create` y `update` en `characters`, ejecutar `node scripts/seed-characters.mjs` y volver a cerrar las escrituras. Con las reglas actuales el script no puede escribir.

## Arquitectura

Angular 22, componentes standalone, signals y OnPush. Firebase JS v13 modular.

```text
src/app
  core/models        tipos, etiquetas en español y mapeo del documento guardado
  core/services      Firebase, catálogo y favoritos
  core/state         estado de favoritos en signals
  features/characters  lista, detalle y favoritos (rutas lazy)
  shared             tarjeta y botón de favorito
```

Rutas:

| Ruta | Pantalla |
| --- | --- |
| `/` | Lista y filtros |
| `/characters/:id` | Ficha |
| `/favorites` | Favoritos que existan en el catálogo |

`CatalogService` lee `characters` una vez y guarda el resultado en memoria. Lista, detalle y favoritos filtran esa lista. `FavoritesState` lee `favorites` y actualiza el set al marcar o quitar.

Dependencias de producto: Angular, RxJS y `firebase`. Tests con Vitest (`ng test`).

## Modelo de datos

Base `(default)`, región `nam5`. No hay índices compuestos: los filtros corren en el cliente.

`characters/{id}` — lectura pública, escritura cerrada.

| Campo | Uso |
| --- | --- |
| `id`, `name`, `status`, `species`, `type`, `gender` | Ficha y filtros |
| `originName` | Origen |
| `locationName`, `locationType`, `locationDimension`, `residentCount` | Bloque de ubicación |
| `image` | URL del retrato |
| `episodes[]` | `id`, `name`, `code`, `airDate` |

`favorites/{characterId}` — lectura pública.

| Campo | Regla |
| --- | --- |
| id del documento | `^[0-9]{1,6}$` |
| `characterId` | Igual al id del documento |
| `createdAt` | Número mayor que 0 |

Cualquier otra ruta queda denegada.

## Estado y navegación

Los filtros y la página viven en query params (`name`, `status`, `species`, `page`). El nombre espera 300 ms antes de navegar. Recargar o compartir la URL conserva la búsqueda.

Los favoritos son un signal global. La carga se hace una vez por sesión; el botón muestra pendiente y error si Firestore rechaza el cambio.

Las tres pantallas entran con `loadComponent`, así que el detalle y favoritos no van en el bundle inicial.

## Decisiones técnicas

- El catálogo quedó en Firestore para que el directorio no dependa de la API en cada visita. Veinte documentos alcanzan para el alcance pedido y evitan paginar en el servidor.
- Ubicación y episodios van dentro del personaje. Así la ficha es una lectura, no una cadena de requests.
- Favoritos van en otra colección. El corazón no reescribe el catálogo, que está cerrado a escrituras.
- El estado de UI usa signals. La URL guarda los filtros para que atrás, recarga y enlace compartido se comporten igual.
- `createdAt` se valida como `number`. `Date.now()` en JavaScript no pasa una regla `int`.

## Escalabilidad y mantenimiento

Con 40 documentos, filtrar en memoria es suficiente y no pide índices. Si el catálogo creciera, la consulta pasaría a Firestore (`where` + `limit`) y el scroll infinito pediría el siguiente bloque al servidor.

Capas separadas: modelos, servicios de datos, estado de favoritos y pantallas. Cambiar la fuente del catálogo no obliga a rehacer las tarjetas.

El seed es repetible, pero hoy exige abrir las reglas un momento. Un siguiente paso natural es sembrarlo con Admin SDK, sin relajar las reglas del cliente.

## Seguridad y validaciones

La configuración web de Firebase está en el cliente. Es la clave pública del SDK; la autorización real está en `firestore.rules`.

- `characters`: cualquiera lee, nadie escribe desde la app.
- `favorites`: alta y edición solo con el esquema de arriba; borrar solo si el id tiene forma de id de personaje.
- El resto de colecciones no tiene `allow`.
- Los filtros comparan texto ya cargado. No se arma una consulta libre contra la base.
- No hay secretos de Admin ni cuentas de servicio en el repo.

## Rendimiento

Una lectura de la colección `characters` por sesión, cacheada en el servicio. Filtros, página y vecinos (anterior/siguiente) salen de esa lista. Los episodios no se vuelven a pedir al abrir la ficha.

La lista muestra 10 tarjetas al entrar. Al acercarse al final, o con el botón “Cargar más”, aparecen los siguientes 10. El filtro sigue haciéndose sobre el catálogo completo ya leído.

## Accesibilidad

Interfaz en español. Controles con nombre accesible (búsqueda, estado, especie, corazón, compartir). El corazón expone `aria-pressed`. Carga, vacío y error usan regiones de estado o alerta. El foco visible sigue el contraste de la interfaz oscura. La ficha se recorre con teclado por enlaces y botones.

## Uso de IA

- Me apoyé en el asistente para el esqueleto de Angular (servicios, rutas, pantallas y reglas) y para iterar la interfaz. El criterio de alcance lo fui cerrando yo: Firestore para favoritos, un catálogo propio y después ampliarlo a 40 personajes con scroll infinito de 10 en 10.
- Acepté la estructura por capas, signals y rutas lazy. Reescribí el rumbo cuando una prueba pasó por Realtime Database: el proyecto se quedó en Cloud Firestore.
- También descarté textos o imágenes inventados. La ficha solo muestra datos que están en el documento.
- El riesgo principal era dejar escrituras abiertas con la clave pública. Se mitigó con un esquema estricto en `favorites` y `allow write: if false` en `characters` después de sembrar.
- Otro riesgo era que la app siguiera llamando a la API en cada visita. El seed corre una sola vez y `CatalogService` solo lee Firestore.
- El prompt de trabajo fue implementar el directorio del PDF, guardar solo 20 personajes en nuestro Firestore y leer lista, detalle y relaciones desde ahí.
- Siguiente mejora: publicar Hosting y, si el catálogo crece, mover los filtros a consultas de Firestore.

## Limitaciones y siguientes pasos

- El catálogo tiene 40 personajes, no el universo completo.
- Los retratos dependen del CDN cuya URL quedó guardada.
- Hosting está preparado en `firebase.json` y falta publicar la URL.
- El favorito antiguo con id `61` no aparece en la lista porque ese personaje no está en el catálogo.
- Tests unitarios cubren utilidades y el arranque de la app, no los flujos de Firestore.
