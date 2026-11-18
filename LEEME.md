# Campo PDP Balones · v1.2

App de campo (PWA) para inventariar la red de Balones con el móvil. Esta primera versión incluye: mapa con PNOA, IGN Base, OpenStreetMap y Catastro; tu posición y su precisión; las capas de referencia del PDS, Geonet, vertidos y subcuencas (solo lectura, con atributos al tocar); toma de POZO de 30 s con foto automática; formulario; envío a la hoja de Google; y funcionamiento sin cobertura.

## Puesta en marcha (una vez)

1. **Carpeta y hoja.** En Drive, junto a la carpeta de Homologación, crea una hoja de cálculo nueva (p. ej. «Inventario PDP Balones»). La carpeta de fotos se crea sola al lado de la hoja («Fotos PDP Balones»).
2. **Script.** En la hoja: Extensiones > Apps Script. Borra lo que haya y pega el contenido de `Codigo_PDP_campo.gs`. Guarda.
3. **Permiso de Drive.** En el editor, elige la función `autorizarDrive` y pulsa Ejecutar. Acepta los permisos. Sin este paso las fotos no suben.
4. **Implementar.** Implementar > Nueva implementación > Aplicación web. Ejecutar como: **yo**. Quién tiene acceso: **cualquier usuario**. Copia el enlace que termina en `/exec`.
   - Cada vez que cambies el script: Implementar > Administrar implementaciones > editar > Nueva versión.
5. **Clave opcional.** Si quieres que el script solo acepte envíos de tus móviles, escribe una clave en la línea `var CLAVE = '';` del script y repítela en cada móvil (Más > Enlace). La clave no va en el repositorio público.
6. **GitHub Pages.** Sube a un repositorio todo el contenido de esta carpeta (`index.html`, `sw.js`, `manifest.webmanifest`, `capas.json`, iconos y carpeta `leaflet`). Activa Pages sobre la rama principal. Abre la URL en cada móvil con Chrome y usa «Añadir a pantalla de inicio».
7. **En cada móvil.** Abre la app y escribe las iniciales (se piden una vez). El enlace del servidor ya va incluido en `API_PREDETERMINADA` (principio del script de `index.html`); Más > Enlace permite cambiarlo. Más > Instalar la app la añade a la pantalla de inicio.
8. **PIN de responsable.** En Más > Responsable, escribe el PIN que quieras y pulsa Calcular. Pega el resultado en `PIN_HASH` (principio del script de `index.html`) y vuelve a publicar. El PIN solo protege «borrar los datos de este móvil». Los técnicos no lo necesitan.
9. **Mapa sin cobertura.** Con cobertura, en Más > Descargar guarda el mapa base del casco (PNOA e IGN Base, unas 390 teselas).

## Cómo se toma un punto

Tomar punto > elige POZO, IMBORNAL o PUNTO DE VERTIDO > «Sí, estoy encima» > 30 s quieto, móvil a 1 m del suelo en vertical sobre el elemento. A mitad de la cuenta hace una foto automática con el ID, las iniciales, la fecha y las coordenadas escritas en la imagen. Después se rellena el formulario (rojo = obligatorio) y se guarda. Si hay cobertura, sale solo; si no, queda en cola y sale cuando vuelva. El contador de arriba a la derecha muestra lo pendiente.

- Identificador: `POZ-<iniciales>-<nº>` (p. ej. POZ-RB-012). Foto: `POZ-RB-012_RB_M30_AAAAMMDD_HHMMSS.jpg`; las fotos extra sin `_M30`.
- Se guarda la **mediana** de las lecturas, el número de lecturas, la dispersión (m) y la precisión GPS. Si hay pocas lecturas (<10), dispersión >6 m o precisión >10 m, la toma sale marcada «REVISAR» y la app avisa antes de guardar.
- Si hay un pozo de referencia a menos de 30 m, la app lo propone en una lista; tú eliges o marcas «nuevo». Nunca enlaza sola.
- Anular: Mis puntos > Anular (doble confirmación). No se borra nada: queda «ANULADO» en la hoja.

## Qué crea la hoja

Pestañas `POZO`, `Fotos` y `Dominios` (se crean solas al primer envío). Cada fila lleva enlace a Google Maps y a la foto en Drive. Las listas desplegables de la app se pueden cambiar editando `Dominios`; el móvil las descarga al enviar. **No borres columnas ni pestañas** si hay fórmulas que las usen: el script repone las columnas que falten, pero las fórmulas que apunten a ellas darían #REF!.

## Límites que conviene tener claros

- El GPS del móvil da ±3 a 5 m en planimetría con buen cielo. Sirve para localizar y asociar elementos, no para sustituir el levantamiento con el Leica.
- La cota GPS del móvil se guarda pero **no vale para hidráulica**. Profundidades: con cinta. Cota de tapa: del MDT o del levantamiento.
- La descarga de teselas depende de que los servidores del IGN lo permitan desde el navegador. La app informa si falla; en ese caso, sin cobertura no habrá mapa de fondo, pero sí capas, GPS y datos.
- La capa de Catastro (WMS) se ha configurado pero no se ha podido probar desde el entorno de desarrollo; si no carga, avísame.
- El enlace del script es público (cualquiera con la URL podría enviar datos). La clave opcional reduce el riesgo; el PIN es solo del lado del móvil.
- Las pruebas se han hecho con Chrome simulado (GPS, cámara y servidor simulados, 42 comprobaciones) y con un simulador del script. Falta la prueba real en un móvil con la hoja de Google real: hazla antes de salir a campo.

## Siguientes fases

2. IMBORNAL y PUNTO DE VERTIDO. 3. CONDUCTO (entre dos nodos) y ayuda de elementos cercanos. 4. Exportación a GeoJSON/CSV para QGIS (X/Y en UTM 30N).

## Novedades v1.2

- Tres tipos de punto (POZO, IMBORNAL, PUNTO DE VERTIDO), cada uno con sus campos y su pestaña en la hoja (`POZO`, `IMBORNAL`, `VERTIDO`). Solo es obligatoria la red (en el vertido, la red que vierte).
- Fotos adicionales: en el formulario y, después, desde Mis puntos > + Foto.
- Responsable (con PIN): duración de la toma de 5 a 30 s en ese móvil, y borrar puntos de ese móvil. Cada punto guarda la duración usada (`duracion_s`).
- Subcuencas: solo las del PDP 2026.
- Al actualizar el script, edita la implementación con «Nueva versión». Las listas nuevas se añaden solas a la pestaña `Dominios`.

## Exportar a QGIS (v1.9)

La exportación la hace el servidor desde la hoja y la deja en Drive, en la carpeta `Exportacion QGIS` (junto a la hoja). Se lanza desde la app (Más > Exportar) o desde la hoja (menú «Campo PDP» > Exportar a QGIS). Genera `POZOS`, `IMBORNALES` y `VERTIDOS` (ETRS89 / UTM 30N, UTF-8) y un ZIP con ellos. Los puntos anulados no se exportan. Cada exportación sustituye a la anterior. Las columnas `FOTO_1` a `FOTO_5` llevan el nombre de la foto y `URL_1` a `URL_5` su enlace en Drive. Tras actualizar el script, hay que volver a ejecutar `autorizarDrive` (hay un permiso nuevo) y crear una nueva versión de la implementación.

## Exportar a Google Earth (v1.10)

La misma exportación genera en la carpeta `Exportacion QGIS` dos archivos más con todos los puntos vigentes (carpetas Pozos, Imbornales y Puntos de vertido, con icono y color distintos; al pinchar, tabla de atributos y fotos):

- `Puntos_PDP_Balones.kmz`: lleva las fotos incrustadas, así que se ven sin depender de Drive. Si las fotos superan 40 MB (`KMZ_MAX_MB` en el script), las que no caben van como enlace a Drive.
- `Puntos_PDP_Balones_enlaces.kml`: ligero, con enlaces a las fotos en Drive. Las fotos solo se ven para quien tenga acceso a la carpeta «Fotos PDP Balones». El script nunca cambia los permisos de Drive: eso lo decide el responsable.

Se abren con Google Earth (web, escritorio o móvil). En «Mis mapas» (mymaps.google.com) se pueden importar, pero las fotos incrustadas del KMZ no se garantizan. Tras actualizar el script no hace falta repetir `autorizarDrive`, solo crear una nueva versión de la implementación.

El KML y el KMZ llevan además los atributos como datos extendidos (mismos nombres de columna que los shapefiles, con `FOTO_1…` y `URL_1…`), de modo que QGIS los importa como columnas. Las fotos en QGIS se siguen enlazando con la `URL_n` de Drive o con la carpeta local, como en los shapefiles.
