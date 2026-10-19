Desarrollado por Jesus Antonio Montaño Oquita:
# Directorio Rick y Morty

Directorio de personajes de la franquicia Rick & Morty, ordenado por sus personajes, episodios y localizaciones donde aparecieron.

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
- [x] URL pública: https://directorio-rick-and-morty.web.app

## Alcance y supuestos

Para este proyecto se construyó una aplicación web construida en Angular y usando Firebase y Firestore como principal base de datos para guardar la información.
Supuestos de esta entrega:

- Se tiene disponible un catalogo propio de 40 personajes de la franquicia Rick & Morty, obtenidos mediante la api Rick & Morty API y posteriormente se obtuvieron varios personajes de esa api para agregarlos directamente a nuestra base de datos, con toda su información respectiva.
- Se realizó un script ubicado en `scripts/seed-characters.mjs`, la cual obtiene 40 personajes usando la api de Rick & Morty y nos ayuda insertandolos con sus respectivas propiedades dentro de nuestra base de datos en Firestore.
- Los retratos no se copiaron a Storage. Cada documento guarda la URL de la imagen y el navegador la pide a ese CDN.
- Se tiene un listado de personajes 10 x 10, los cuales se obtienen mediante un scroll infinito que va avanzando por cada 10 personajes que aparezcan en el menú, al superar los 10 personajes, el scroll infinito consulta 10 registros mas
y los imprime dentro de nuestra app, así posteriormente hasta mostrar los 40 disponibles.
- No hay cuentas. El directorio es público y las reglas limitan qué se puede escribir.
- Se cuenta con una barra de búsqueda de productos, selects para filtrar por estado (vivo/fallecido) y por su especie
- Al hacer click sobre un personaje, te abré una nueva página designada para mostrar la info principal de este personaje (información general, apariciones y episodios donde aparece.

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
Para este proyecto se utilizó Angular 22, uso de componentes standalone, signas y OnPush. Se implementó Firebase JS v13 modular.

La arquitectura elegida en base a la experiencia adquirida por otros proyectos y las mejores prácticas fue la siguiente:

```text
src/app
  core/models          tipos, etiquetas en español y mapeo del documento guardado
  core/services        Firebase, catálogo y favoritos
  core/state           estado de favoritos en signals
  features/characters  lista, detalle y favoritos (rutas lazy)
  shared               tarjeta y botón de favorito
```

Para las rutas, elegimos la siguiente configuración:

| Ruta | Pantalla |
| --- | --- |
| `/` | Lista y filtros |
| `/characters/:id` | Ficha |
| `/favorites` | Favoritos que existan en el catálogo |

`CatalogService` lee `characters` una vez y guarda el resultado en memoria. Lista, detalle y favoritos filtran esa lista. `FavoritesState` lee `favorites` y actualiza el set al marcar o quitar.

Dependencias de producto: Angular, RxJS y `firebase`. Tests con Vitest (`ng test`).

## Modelo de datos

La Base usa `(default)`, región `nam5`. No hay índices compuestos: los filtros corren en el cliente.

`characters/{id}` — lectura pública, escritura cerrada.

Se crearon dos colecciones, una para los personajes y otra para los favoritos

Los modelos empleados y las colecciones para los personajes son los siguientes:

Personajes:

| Campo | Uso |
| --- | --- |
| `id`, `name`, `status`, `species`, `type`, `gender` | Ficha y filtros |
| `originName` | Origen |
| `locationName`, `locationType`, `locationDimension`, `residentCount` | Bloque de ubicación |
| `image` | URL del retrato |
| `episodes[]` | `id`, `name`, `code`, `airDate` |

Personajes guardados como favoritos:

| Campo | Regla |
| --- | --- |
| id del documento | `^[0-9]{1,6}$` |
| `characterId` | Igual al id del documento |
| `createdAt` | Número mayor que 0 |

## Estado y navegación

Los filtros y la página están diseñados para vivir en un query params (`name`, `status`, `species`, `page`). El nombre espera 300 ms antes de navegar. Recargar o compartir la URL conserva la búsqueda.

Los favoritos son un signal global. La carga se hace una vez por sesión, el botón muestra pendiente y error si Firestore rechaza el cambio.

Las tres pantallas entran con `loadComponent`, así que el detalle y favoritos no van en el bundle inicial.

## Decisiones técnicas

- El catálogo quedó en Firestore para que el directorio no dependa de la API cada que se recarge la página,
- Ubicación y episodios van dentro del personaje, así cada ficha es una lectura y no muchos requests
- Dentro de Firestore, como se mencionó, favoritos van en otra colección, no se rescribe el catalogo el cual está cerrado a escrituras.
- El estado de UI usa signals. La URL guarda los filtros para que atrás, recarga y enlace compartido se comporten igual.
- createdAt se valida como number.Date.now() en JavaScript no pasa una regla int.

## Escalabilidad y mantenimiento

- Con 40 documentos, filtrar en memoria es suficiente y no pide índices, si el catálogo creciera, la consulta pasaría a Firestore where + limit,  el scroll infinito pediría el siguiente bloque al servidor.
- Capas separadas: modelos, servicios de datos, estado de favoritos y pantallas, cambiar la fuente del catalogo no hace necesario volver a generar las tarjetas.
- Como las imagenes son traidas directamente desde la api de Rick & Morty, habria que crear un storage después para guardar esas imagenes para no depender de recursos externos.
- Los modelos de los personajes siguen y respetan la forma de la API (url, created, episode como lista de strings) y el mapeo rellena varios de esos campos vacíos. Soltar esa forma obliga a tocar el modelo, el mapeo y las plantillas que leen origen, ubicación y episodios.
- El otro límite es que CatalogService baja los 40 documentos y filtra en memoria. Pasar el filtro y el scroll infinito a consultas de servidor cambia ese servicio y el corte de 10 en 10 de la lista. La ficha no se entera si getDetail sigue devolviendo personaje, episodios, ubicación y vecinos.

## Seguridad y validaciones

La configuración web de Firebase está en el cliente. Es la clave pública del SDK; la autorización real está en `firestore.rules`.

- characters: cualquiera lee, nadie escribe desde la app.
- favorites: alta y edición solo con el esquema de arriba; borrar solo si el id tiene forma de id de personaje.
- El resto de colecciones no tiene `allow`.
- Los filtros comparan texto ya cargado. No se arma una consulta libre contra la base.
- No hay secretos de Admin ni cuentas de servicio en el repo.
- Absolutamente todos los inputs y selects (de ser posible) ya no admiten simbolos ni caracteres especiales esto con el fin de evitar inyecciones SQL que en este caso posiblemente no apliquen, pero es una norma en general y un estandar que manejo en todos mis proyectos, proteger todos los selects e inputs desde que son creados.
- Se decidió dejar los archivos environment de Angular para este proyecto subidos en el repo, ya que la protección real está en firebase.rules. Estos archivos se dejan con el fin de quien clone dentro del equipo de developers pueda correr la app sin problemas.

## Rendimiento

-Una lectura de la colección `characters` por sesión, cacheada en el servicio. Filtros, página y vecinos (anterior/siguiente) salen de esa lista. Los episodios no se vuelven a pedir al abrir la ficha.

-La lista muestra 10 tarjetas al entrar, al acercarse al final, o con el botón Cargar más, aparecen los siguientes 10. El filtro sigue haciéndose sobre el catálogo completo ya leído.

-En vista Responsiva/Mobile, se muestran dos productos a la vez para no cargar la vista tanto, en un listado de 2x2 por cada línea.

## Accesibilidad

-Interfaz en español. 
-Controles con nombre accesible (búsqueda, estado, especie, corazón, compartir). 
-El botón de corazón expone `aria-pressed`. Carga, vacío y error usan regiones de estado o alerta. El foco visible sigue el contraste de la interfaz oscura. La ficha se recorre con teclado por enlaces y botones.

## Uso de IA

- Me apoyé con un asistente de IA para el esqueleto de Angular (servicios, rutas, pantallas y reglas), basandome en experiencia con proyectos anteriores en los que he trabajado.
- Acepté la estructura por capas, signals y rutas lazy. El agente quería implementar el uso de Realtime DB, pero decidí usar y cambiar la estructura a Firestore, por comodidad y mas facil manejo de uso, 
- Se descartaron manualmente textos e información hardcodeada que el agente implementó, con el fin de que toda la información proveniera directamente de nuestra base de datos.
- Se uso IA con el fin de acelerar el diseño en general de la app, posteriormente se hizo un rediseño a lo que el agente implementó ya que no era una vista completamente responsiva, además de que parecía muy confusa y poco intiutiva.
- El riesgo principal era dejar escrituras abiertas con la clave pública. Se mitigó con un esquema estricto en `favorites` y `allow write: if false` en `characters` después de implementar los 40 registros.
- Se usó el agente con el fin de hacer un script que tomará información y la insertara dentro de nuestra base de datos de Firebase Store, el proceso me hizo conseguir 20 agentes, pero después decidi incrementar el rango y hacer que el script trajerá 40 personajes para tener mas manejo de los datos
- Uno de los riesgos con el script era que la app siguiera llamando a la API en cada visita. El seed corre una sola vez y `CatalogService` solo lee Firestore una vez implementados los registros.

- Algunos de los prompts de trabajo empleados:

* Basandote en la estructura brindada por este proyecto (un proyecto externo personal que contiene mis mejores prácticas y forma de trabajo) podrías apoyarme a crear la estructura principal de mi proyecto de Angular nuevo.
* Podrías apoyarme a realizar un script que me permita obtener un catalogo de 40 productos tomados desde la api oficial de Rick & Morty e insertarlos dentro de una colección dentro de mi proyecto de Firebase.
* Podrías apoyarme con las pruebas unitarias del proyecto y lo que tenemos avanzado hasta ahora.
* Apoyame con algunos bosquejos y recomendaciones para rediseñar esta vista.

## Limitaciones y siguientes pasos

- El catálogo tiene 40 personajes, no todos los personajes de la franquicia.
- Fácilmente podría emplearse la API oficial y así tener todos los personajes completos.
- Los retratos e imágenes de los personajes dependen del CDN cuya URL quedó guardada.
- Siguiente mejora: si el catálogo crece, mover los filtros a consultas de Firestore.
- La URL publicada es https://directorio-rick-and-morty.web.app. Un cambio nuevo se publica con `npm run build` y `npx firebase deploy --only hosting`, esto se hace manualmente, un auto deploy quedaría mas acorde con el proyecto si llega a escalar.
- Tests unitarios cubren utilidades y el arranque de la app, no los flujos de Firestore.
