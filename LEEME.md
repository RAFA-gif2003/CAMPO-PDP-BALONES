# Campo PDP Balones · fase 1

App de campo (PWA) para inventariar la red de Balones con el móvil. Esta primera versión incluye: mapa con PNOA, IGN Base, OpenStreetMap y Catastro; tu posición y su precisión; las capas de referencia del PDS, Geonet, vertidos y subcuencas (solo lectura, con atributos al tocar); toma de POZO de 30 s con foto automática; formulario; envío a la hoja de Google; y funcionamiento sin cobertura.

## Puesta en marcha (una vez)

1. **Carpeta y hoja.** En Drive, junto a la carpeta de Homologación, crea una hoja de cálculo nueva (p. ej. «Inventario PDP Balones»). La carpeta de fotos se crea sola al lado de la hoja («Fotos PDP Balones»).
2. **Script.** En la hoja: Extensiones > Apps Script. Borra lo que haya y pega el contenido de `Codigo_PDP_campo.gs`. Guarda.
3. **Permiso de Drive.** En el editor, elige la función `autorizarDrive` y pulsa Ejecutar. Acepta los permisos. Sin este paso las fotos no suben.
4. **Implementar.** Implementar > Nueva implementación > Aplicación web. Ejecutar como: **yo**. Quién tiene acceso: **cualquier usuario**. Copia el enlace que termina en `/exec`.
   - Cada vez que cambies el script: Implementar > Administrar implementaciones > editar > Nueva versión.
5. **Clave opcional.** Si quieres que el script solo acepte envíos de tus móviles, escribe una clave en la línea `var CLAVE = '';` del script y repítela en cada móvil (Más > Enlace). La clave no va en el repositorio público.
6. **GitHub Pages.** Sube a un repositorio todo el contenido de esta carpeta (`index.html`, `sw.js`, `manifest.webmanifest`, `capas.json`, iconos y carpeta `leaflet`). Activa Pages sobre la rama principal. Abre la URL en cada móvil con Chrome y usa «Añadir a pantalla de inicio».
7. **En cada móvil.** Abre la app, escribe las iniciales (se piden una vez), ve a Más > Enlace, pega la URL `/exec` (y la clave si la usas) y guarda. Si prefieres que los móviles no tengan que pegarla, rellena `API_PREDETERMINADA` al principio del script de `index.html`.
8. **PIN de responsable.** En Más > Responsable, escribe el PIN que quieras y pulsa Calcular. Pega el resultado en `PIN_HASH` (principio del script de `index.html`) y vuelve a publicar. El PIN solo protege «borrar los datos de este móvil». Los técnicos no lo necesitan.
9. **Mapa sin cobertura.** Con cobertura, en Más > Descargar guarda el mapa base del casco (PNOA e IGN Base, unas 390 teselas).

## Cómo se toma un pozo

Tomar pozo > «Sí, estoy encima» > 30 s quieto, móvil a 1 m del suelo en vertical sobre el elemento. A mitad de la cuenta hace una foto automática con el ID, las iniciales, la fecha y las coordenadas escritas en la imagen. Después se rellena el formulario (rojo = obligatorio) y se guarda. Si hay cobertura, sale solo; si no, queda en cola y sale cuando vuelva. El contador de arriba a la derecha muestra lo pendiente.

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
