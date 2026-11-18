/* Campo PDP Balones · servidor (Google Apps Script vinculado a la hoja de cálculo)
   Implementar como aplicación web: Ejecutar como YO · Acceso: cualquier usuario.
   Antes de implementar, ejecutar UNA vez la función autorizarDrive(). */

var EXPORT_CLAVE = '';                       // clave para exportar desde la app. Vacía = la exportación solo se puede lanzar desde la hoja (menú Campo PDP)
var CLAVE = '';                              // si se rellena, la app debe enviar la misma clave
var CARPETA_FOTOS = 'Fotos PDP Balones';     // se crea junto a la hoja (misma carpeta de Drive)
var HOJA_FOTOS = 'Fotos';
var HOJA_DOM = 'Dominios';

var DOMINIOS = {
  red: ['Pluviales', 'Unitaria', 'Residuales'],
  tipo_pozo: ['Registro', 'Auxiliar', 'Cabecera', 'Resalto', 'Unión', 'Alivio'],
  material_pozo: ['Prefabricado', 'Mixto', 'Ladrillo in situ', 'Hormigón en masa', 'Otro'],
  forma_tapa: ['Circular', 'Cuadrada', 'Rectangular', 'Otra'],
  estado: ['Bueno', 'Regular', 'Malo'],
  patologias: ['Sin patología', 'Falta limpieza', 'Sedimentos', 'Toallitas', 'Raíces', 'Colmatado', 'No accesible', 'Otros'],
  si_no: ['Sí', 'No'],
  destino_alivio: ['A cauce natural', 'Otro'],
  tipo_imbornal: ['Sumidero de calzada', 'Buzón', 'Rejilla en acera', 'Rejilla transversal', 'Sumidero de cuneta', 'Otro'],
  material_reja: ['Fundición', 'Acero', 'Hormigón', 'Otro'],
  obstruccion: ['Sin obstrucción', 'Parcial', 'Total'],
  conectado_a: ['Pozo', 'Colector', 'Otro imbornal', 'Desconocido'],
  tipo_red_vertido: ['Pluviales', 'Residuales', 'Unitaria'],
  estructura_vertido: ['Boca de tubería', 'Aliviadero', 'Canal', 'Arqueta', 'Otra'],
  material_vertido: ['Hormigón', 'PVC', 'PE', 'Fundición', 'Gres', 'Otro'],
  destino_vertido: ['Barranco', 'Cauce', 'Terreno', 'Otra red', 'Otro'],
  caudal_obs: ['Sin flujo', 'Escaso', 'Moderado', 'Abundante'],
  evidencias: ['Sin evidencias', 'Olor', 'Espuma', 'Sólidos', 'Color anómalo'],
  material_conducto: ['THM', 'PVC corrugado', 'PVC liso', 'PE corrugado', 'Hormigón armado', 'Fundición', 'Gres', 'Galería rectangular', 'Otro']
};

var HEAD = ['recibido', 'fecha_hora', 'usuario', 'id_elemento', 'estado_registro', 'calidad', 'lat', 'lon', 'mapa',
  'lecturas', 'duracion_s', 'dispersion_m', 'precision_gps_m', 'cota_gps_m', 'ref_id', 'ref_dist_m'];
var ATTR = {
  POZO: ['red', 'tipo', 'material', 'forma_tapa', 'd_tapa_cm', 'prof_solera_m', 'estado', 'sedimentos_pct', 'accesible', 'patologias',
    'resalto', 'prof_resalto_m', 'alivio', 'destino_alivio', 'acometidas', 'imbornales_conectados', 'observaciones'],
  IMBORNAL: ['red', 'tipo_imbornal', 'largo_reja_cm', 'ancho_reja_cm', 'material_reja', 'sifonico', 'estado', 'obstruccion',
    'conectado_a', 'd_conexion_mm', 'prof_m', 'observaciones'],
  VERTIDO: ['tipo_red', 'estructura', 'd_mm', 'material', 'destino', 'cauce', 'resguardo_m', 'estado', 'caudal', 'evidencias', 'observaciones']
};
function capa_(c) { c = String(c || 'POZO').toUpperCase(); return ATTR[c] ? c : 'POZO'; }
function cabCapa_(c) {
  c = capa_(c);
  var cond = c === 'POZO' ? ['n_entradas', 'n_salidas', 'conductos'] : [];
  return HEAD.concat(ATTR[c], cond, ['fotos', 'fotos_drive', 'app', 'id']);
}
var CAB_FOTOS = ['recibido', 'fecha_hora', 'usuario', 'capa', 'id_elemento', 'nombre_archivo', 'en_medicion_30s', 'peso_kb', 'alto_pie_px',
  'lat', 'lon', 'mapa', 'recibida_en_drive', 'id'];

/* Ejecutar una vez a mano desde el editor: concede el permiso de Drive. */
function autorizarDrive() {
  var c = carpeta_();
  Logger.log('Carpeta de fotos: ' + c.getUrl());
  return c.getUrl();
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

/* Hoja con cabecera autorreparable: crea la pestaña y añade las columnas que falten (nunca borra ni reordena). */
function hoja_(nombre, cab) {
  var ss = SpreadsheetApp.getActive();
  var h = ss.getSheetByName(nombre);
  if (!h) h = ss.insertSheet(nombre);
  var ult = h.getLastColumn();
  var actual = ult ? h.getRange(1, 1, 1, ult).getValues()[0] : [];
  if (!actual.length || actual.every(function (x) { return x === ''; })) {
    h.getRange(1, 1, 1, cab.length).setValues([cab]);
    h.setFrozenRows(1);
    h.getRange(1, 1, 1, cab.length).setFontWeight('bold');
    return h;
  }
  var faltan = cab.filter(function (c) { return actual.indexOf(c) < 0; });
  if (faltan.length) {
    h.getRange(1, actual.length + 1, 1, faltan.length).setValues([faltan]).setFontWeight('bold');
  }
  return h;
}
function cabecera_(h) {
  var n = h.getLastColumn();
  return n ? h.getRange(1, 1, 1, n).getValues()[0] : [];
}
function col_(h, nombre) { return cabecera_(h).indexOf(nombre) + 1; }

function carpeta_() {
  var f = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  var padres = f.getParents();
  var padre = padres.hasNext() ? padres.next() : DriveApp.getRootFolder();
  var it = padre.getFoldersByName(CARPETA_FOTOS);
  return it.hasNext() ? it.next() : padre.createFolder(CARPETA_FOTOS);
}

function enlaceMapa_(lat, lon) {
  return (isFinite(lat) && isFinite(lon)) ? 'https://www.google.com/maps?q=' + lat + ',' + lon : '';
}

/* Identificadores ya recibidos (la columna "id" de cada hoja; se miran las últimas 2000 filas). */
function idsExistentes_(h) {
  var c = col_(h, 'id');
  var n = h.getLastRow();
  if (!c || n < 2) return {};
  var ini = Math.max(2, n - 1999);
  var v = h.getRange(ini, c, n - ini + 1, 1).getValues();
  var o = {};
  v.forEach(function (r) { if (r[0] !== '') o[String(r[0])] = true; });
  return o;
}
function nuevasFilas_(h, objetos) {
  var ex = idsExistentes_(h);
  var filas = [];
  objetos.forEach(function (o) {
    if (ex[String(o.id)]) return;
    ex[String(o.id)] = true;
    var hc = cabecera_(h);
    filas.push(hc.map(function (k) { return o[k] === undefined || o[k] === null ? '' : o[k]; }));
  });
  if (filas.length) {
    var ini = h.getLastRow() + 1;
    h.getRange(ini, 1, filas.length, filas[0].length).setValues(filas);
  }
  return filas.length;
}

function filaRegistro_(r) {
  var a = r.attr || {};
  var cond = r.cond || [];
  var o = {
    recibido: new Date(), fecha_hora: r.hora, usuario: r.usuario, id_elemento: r.cid, estado_registro: 'VIGENTE',
    calidad: r.calidad, lat: r.lat, lon: r.lon, mapa: enlaceMapa_(r.lat, r.lon),
    lecturas: r.lecturas, duracion_s: r.dur, dispersion_m: r.disp, precision_gps_m: r.prec, cota_gps_m: r.cota,
    ref_id: r.ref, ref_dist_m: r.refDist,
    n_entradas: cond.filter(function (c) { return c.s === 'E'; }).length,
    n_salidas: cond.filter(function (c) { return c.s === 'S'; }).length,
    conductos: cond.map(function (c) { return (c.s === 'E' ? 'E' : 'S') + ' Ø' + (c.d == null ? '' : c.d) + ' ' + (c.m || '') + ' p' + (c.p == null ? '' : c.p); }).join(' | '),
    fotos: (r.fotos || []).join(' | '), fotos_drive: '', app: r.app, id: r.id
  };
  ATTR[capa_(r.capa)].forEach(function (k) {
    var v = a[k];
    o[k] = Array.isArray(v) ? v.join('; ') : (v === undefined || v === null ? '' : v);
  });
  return o;
}
function nombreHojaCapa_(capa) { return capa_(capa); }

function guardarRegistros_(registros) {
  var porCapa = {}, n = 0;
  registros.forEach(function (r) { var k = nombreHojaCapa_(r.capa); (porCapa[k] = porCapa[k] || []).push(r); });
  Object.keys(porCapa).forEach(function (k) {
    var h = hoja_(k, cabCapa_(k));
    n += nuevasFilas_(h, porCapa[k].map(filaRegistro_));
  });
  return n;
}
function guardarFichasFotos_(fotos) {
  if (!fotos.length) return 0;
  var h = hoja_(HOJA_FOTOS, CAB_FOTOS);
  return nuevasFilas_(h, fotos.map(function (f) {
    return {
      recibido: new Date(), fecha_hora: f.hora, usuario: f.usuario, capa: f.capa, id_elemento: f.cid, nombre_archivo: f.nombre,
      en_medicion_30s: f.auto ? 'sí' : 'no', peso_kb: f.peso ? Math.round(f.peso / 1024) : '', alto_pie_px: f.alto || '',
      lat: f.lat, lon: f.lon, mapa: enlaceMapa_(f.lat, f.lon), recibida_en_drive: '', id: f.id
    };
  }));
}
function anular_(anulaciones) {
  var n = 0;
  anulaciones.forEach(function (a) {
    var h = hoja_(nombreHojaCapa_(a.capa), cabCapa_(a.capa));
    var cid = col_(h, 'id'), ce = col_(h, 'estado_registro');
    var ult = h.getLastRow();
    if (ult < 2) return;
    var ids = h.getRange(2, cid, ult - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]) === String(a.ref)) {
        h.getRange(i + 2, ce).setValue('ANULADO');
        h.getRange(i + 2, ce).setNote('Anulado por ' + a.usuario + ' el ' + a.hora);
        n++;
        break;
      }
    }
  });
  return n;
}

/* Guarda la imagen en Drive (sin duplicar por nombre) y anota el enlace en Fotos y en la fila del elemento. */
function guardarImagen_(im) {
  var carp = carpeta_();
  var it = carp.getFilesByName(im.nombre);
  var f;
  if (it.hasNext()) { f = it.next(); }
  else {
    var blob = Utilities.newBlob(Utilities.base64Decode(im.b64), 'image/jpeg', im.nombre);
    f = carp.createFile(blob);
  }
  marcarSubida_(im, f.getUrl());
  return f.getUrl();
}
function marcarSubida_(im, url) {
  var h = hoja_(HOJA_FOTOS, CAB_FOTOS);
  var cn = col_(h, 'nombre_archivo'), cr = col_(h, 'recibida_en_drive');
  var ult = h.getLastRow();
  if (ult >= 2) {
    var nom = h.getRange(2, cn, ult - 1, 1).getValues();
    for (var i = nom.length - 1; i >= 0; i--) {
      if (nom[i][0] === im.nombre) { h.getRange(i + 2, cr).setFormula('=HYPERLINK("' + url + '";"ver foto")'); break; }
    }
  }
  if (im.capa && im.cid) {
    var hc = hoja_(nombreHojaCapa_(im.capa), cabCapa_(im.capa));
    var ci = col_(hc, 'id_elemento'), cd = col_(hc, 'fotos_drive');
    var u = hc.getLastRow();
    if (u >= 2) {
      var ids = hc.getRange(2, ci, u - 1, 1).getValues();
      for (var j = ids.length - 1; j >= 0; j--) {
        if (ids[j][0] === im.cid) {
          var celda = hc.getRange(j + 2, cd);
          var prev = String(celda.getValue() || '');
          if (prev.indexOf(url) < 0) celda.setValue((prev ? prev + ' | ' : '') + url);
          break;
        }
      }
    }
  }
}

function sembrarDominios_() {
  var h = hoja_(HOJA_DOM, ['lista', 'valor']);
  var n = h.getLastRow();
  var hay = {};
  if (n >= 2) h.getRange(2, 1, n - 1, 1).getValues().forEach(function (r) { hay[String(r[0])] = true; });
  var filas = [];
  Object.keys(DOMINIOS).forEach(function (k) { if (!hay[k]) DOMINIOS[k].forEach(function (v) { filas.push([k, v]); }); });
  if (filas.length) h.getRange(n + 1, 1, filas.length, 2).setValues(filas);
  return h;
}
function leerDominios_() {
  var h = sembrarDominios_();
  var n = h.getLastRow();
  var o = {};
  if (n >= 2) h.getRange(2, 1, n - 1, 2).getValues().forEach(function (r) {
    if (r[0] === '' || r[1] === '') return;
    (o[String(r[0])] = o[String(r[0])] || []).push(String(r[1]));
  });
  return o;
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
    var d = JSON.parse(e.postData.contents);
    if (CLAVE && d.clave !== CLAVE) return json_({ok: false, error: 'clave incorrecta'});
    if (d.imagen) {
      var url = guardarImagen_(d.imagen);
      return json_({ok: true, url: url});
    }
    var nr = guardarRegistros_(d.registros || []);
    var nf = guardarFichasFotos_(d.fotos || []);
    var na = anular_(d.anulaciones || []);
    return json_({ok: true, registros: nr, fotos: nf, anuladas: na});
  } catch (err) {
    return json_({ok: false, error: String(err && err.message || err)});
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function doGet(e) {
  var q = e && e.parameter && e.parameter.q;
  if (CLAVE && (!e.parameter || e.parameter.clave !== CLAVE)) return json_({ok: false, error: 'clave incorrecta'});
  if (q === 'dominios') return json_({ok: true, dominios: leerDominios_()});
  if (q === 'exportar') {
    if (!EXPORT_CLAVE) return json_({ok: false, error: 'La exportación desde la app está desactivada. Hazla desde la hoja de Google: menú Campo PDP.'});
    if (!e.parameter || e.parameter.exp !== EXPORT_CLAVE) return json_({ok: false, error: 'clave de exportación incorrecta'});
    var lock = LockService.getScriptLock();
    try { lock.waitLock(25000); return json_({ok: true, exportacion: exportarQgis()}); }
    catch (err) { return json_({ok: false, error: String(err && err.message || err)}); }
    finally { try { lock.releaseLock(); } catch (x) {} }
  }
  if (q === 'probarfoto') {
    try { return json_({ok: true, carpeta: carpeta_().getUrl()}); }
    catch (err) { return json_({ok: false, error: String(err.message || err)}); }
  }
  return json_({ok: true, servicio: 'Campo PDP Balones', hora: new Date().toISOString()});
}


/* ====================== Exportación a shapefiles para QGIS ======================
   Lee las pestañas POZO, IMBORNAL y VERTIDO de la hoja (sin los ANULADOS) y deja en la carpeta
   «Exportacion QGIS» (junto a la hoja) tres shapefiles en ETRS89 / UTM 30N, más un ZIP con ellos.
   Se lanza desde el menú «Campo PDP» de la hoja o desde la app (Más > Exportar a Drive). */
var CARPETA_EXPORT = 'Exportacion QGIS';
var SHP_ARCHIVO = {POZO: 'POZOS', IMBORNAL: 'IMBORNALES', VERTIDO: 'VERTIDOS'};
var SHP_COLS = {
  red: 'RED', tipo: 'TIPO', material: 'MATERIAL', forma_tapa: 'FORMA_TAPA', d_tapa_cm: 'D_TAPA_CM', prof_solera_m: 'PROF_SOL_M', estado: 'ESTADO',
  sedimentos_pct: 'SEDIM_PCT', accesible: 'ACCESIBLE', patologias: 'PATOLOG', resalto: 'RESALTO', prof_resalto_m: 'PROF_RES_M', alivio: 'ALIVIO',
  destino_alivio: 'DEST_ALIV', acometidas: 'ACOMET', imbornales_conectados: 'IMB_CONECT', observaciones: 'OBSERV',
  tipo_imbornal: 'TIPO_IMB', largo_reja_cm: 'LARGO_CM', ancho_reja_cm: 'ANCHO_CM', material_reja: 'MAT_REJA', sifonico: 'SIFONICO', obstruccion: 'OBSTRUC',
  conectado_a: 'CONECT_A', d_conexion_mm: 'D_CONEX_MM', prof_m: 'PROF_M',
  tipo_red: 'TIPO_RED', estructura: 'ESTRUCT', d_mm: 'D_MM', destino: 'DESTINO', cauce: 'CAUCE', resguardo_m: 'RESGUARD_M', caudal: 'CAUDAL', evidencias: 'EVIDENC'
};
var ATTR_NUM = {d_tapa_cm: 1, prof_solera_m: 1, sedimentos_pct: 1, prof_resalto_m: 1, acometidas: 1, imbornales_conectados: 1, largo_reja_cm: 1,
  ancho_reja_cm: 1, d_conexion_mm: 1, prof_m: 1, d_mm: 1, resguardo_m: 1};
var MAX_FOTOS_COL = 5;
var PRJ_25830 = 'PROJCS["ETRS89 / UTM zone 30N",GEOGCS["ETRS89",DATUM["European_Terrestrial_Reference_System_1989",SPHEROID["GRS 1980",6378137,298.257222101]],PRIMEM["Greenwich",0],UNIT["degree",0.0174532925199433]],PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",-3],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],UNIT["metre",1]]';

function utm30_(lat, lon) {
  var a = 6378137, f = 1 / 298.257222101, k0 = 0.9996, n = f / (2 - f), r = Math.PI / 180;
  var A = a / (1 + n) * (1 + n * n / 4 + n * n * n * n / 64);
  var al = [n / 2 - 2 * n * n / 3 + 5 * n * n * n / 16, 13 * n * n / 48 - 3 * n * n * n / 5, 61 * n * n * n / 240];
  var phi = lat * r, lam = (lon + 3) * r, sp = Math.sin(phi), q = 2 * Math.sqrt(n) / (1 + n);
  var atanh = function (x) { return 0.5 * Math.log((1 + x) / (1 - x)); };
  var t = Math.sinh(atanh(sp) - q * atanh(q * sp));
  var xi0 = Math.atan2(t, Math.cos(lam)), eta0 = atanh(Math.sin(lam) / Math.sqrt(1 + t * t));
  var xi = xi0, eta = eta0;
  for (var j = 1; j <= 3; j++) {
    xi += al[j - 1] * Math.sin(2 * j * xi0) * Math.cosh(2 * j * eta0);
    eta += al[j - 1] * Math.cos(2 * j * xi0) * Math.sinh(2 * j * eta0);
  }
  return {x: 500000 + k0 * A * eta, y: k0 * A * xi};
}
function utf8_(txt) {
  var b = Utilities.newBlob(String(txt == null ? '' : txt), 'text/plain').getBytes(), o = [];
  for (var i = 0; i < b.length; i++) o.push(b[i] & 255);
  return o;
}
function cortar_(txt, max) {
  var t = String(txt == null ? '' : txt);
  var b = utf8_(t);
  while (b.length > max) { t = t.slice(0, -1); b = utf8_(t); }
  return b;
}
function aBlob_(u8, nombre) {
  var s = [];
  for (var i = 0; i < u8.length; i++) s.push(u8[i] > 127 ? u8[i] - 256 : u8[i]);
  return Utilities.newBlob(s, 'application/octet-stream', nombre);
}
function dbf_(campos, filas) {
  var nf = campos.length, hl = 32 + 32 * nf + 1, rl = 1, i, k;
  campos.forEach(function (c) { rl += c.len; });
  var out = new Uint8Array(hl + rl * filas.length + 1), dv = new DataView(out.buffer), d = new Date();
  out[0] = 3; out[1] = d.getFullYear() - 1900; out[2] = d.getMonth() + 1; out[3] = d.getDate();
  dv.setUint32(4, filas.length, true); dv.setUint16(8, hl, true); dv.setUint16(10, rl, true);
  campos.forEach(function (c, i2) {
    var o = 32 + 32 * i2, nb = utf8_(c.n).slice(0, 10);
    for (var q = 0; q < nb.length; q++) out[o + q] = nb[q];
    out[o + 11] = c.t.charCodeAt(0); out[o + 16] = c.len; out[o + 17] = c.dec || 0;
  });
  out[hl - 1] = 0x0D;
  filas.forEach(function (fila, kk) {
    var o = hl + rl * kk; out[o++] = 0x20;
    campos.forEach(function (c, ii) {
      var j;
      for (j = 0; j < c.len; j++) out[o + j] = 0x20;
      var v = fila[ii];
      if (c.t === 'N') {
        if (v !== null && v !== undefined && v !== '' && isFinite(v)) {
          var t = Number(v).toFixed(c.dec || 0);
          if (t.length > c.len) t = t.slice(0, c.len);
          for (j = 0; j < t.length; j++) out[o + c.len - t.length + j] = t.charCodeAt(j);
        }
      } else {
        var bb = cortar_(v, c.len);
        for (j = 0; j < bb.length; j++) out[o + j] = bb[j];
      }
      o += c.len;
    });
  });
  out[out.length - 1] = 0x1A;
  return out;
}
function shp_(pts) {
  var n = pts.length, len = 100 + 28 * n, shp = new Uint8Array(len), shx = new Uint8Array(100 + 8 * n);
  var a = new DataView(shp.buffer), b = new DataView(shx.buffer);
  var xs = pts.map(function (p) { return p.x; }), ys = pts.map(function (p) { return p.y; });
  var mnx = Math.min.apply(null, xs), mny = Math.min.apply(null, ys), mxx = Math.max.apply(null, xs), mxy = Math.max.apply(null, ys);
  [a, b].forEach(function (dv, i) {
    dv.setInt32(0, 9994, false); dv.setInt32(24, (i ? 100 + 8 * n : len) / 2, false); dv.setInt32(28, 1000, true); dv.setInt32(32, 1, true);
    dv.setFloat64(36, mnx, true); dv.setFloat64(44, mny, true); dv.setFloat64(52, mxx, true); dv.setFloat64(60, mxy, true);
  });
  pts.forEach(function (p, i) {
    var o = 100 + 28 * i;
    a.setInt32(o, i + 1, false); a.setInt32(o + 4, 10, false); a.setInt32(o + 8, 1, true); a.setFloat64(o + 12, p.x, true); a.setFloat64(o + 20, p.y, true);
    b.setInt32(100 + 8 * i, o / 2, false); b.setInt32(104 + 8 * i, 10, false);
  });
  return {shp: shp, shx: shx};
}

function carpetaExport_() {
  var f = DriveApp.getFileById(SpreadsheetApp.getActive().getId());
  var padres = f.getParents();
  var padre = padres.hasNext() ? padres.next() : DriveApp.getRootFolder();
  var it = padre.getFoldersByName(CARPETA_EXPORT);
  return it.hasNext() ? it.next() : padre.createFolder(CARPETA_EXPORT);
}
function urlsFotos_() {
  var m = {}, it = carpeta_().getFiles();
  while (it.hasNext()) { var f = it.next(); m[f.getName()] = f.getUrl(); }
  return m;
}
function texto_(v) {
  if (Object.prototype.toString.call(v) === '[object Date]') return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
  return v === null || v === undefined ? '' : String(v);
}
function num_(v) { return v === '' || v === null || v === undefined || !isFinite(v) ? '' : Number(v); }

/* Devuelve {carpeta, zip, puntos:{POZOS:n,...}} */
function exportarQgis() {
  var ss = SpreadsheetApp.getActive(), carp = carpetaExport_(), urls = urlsFotos_();
  var ficheros = [], resumen = {};
  Object.keys(SHP_ARCHIVO).forEach(function (capa) {
    var h = ss.getSheetByName(capa);
    if (!h || h.getLastRow() < 2) return;
    var v = h.getDataRange().getValues(), cab = v[0], idx = {};
    cab.forEach(function (c, i) { idx[c] = i; });
    var get = function (r, k) { return idx[k] === undefined ? '' : r[idx[k]]; };
    var filas = v.slice(1).filter(function (r) {
      return get(r, 'estado_registro') !== 'ANULADO' && isFinite(get(r, 'lat')) && get(r, 'lat') !== '' && isFinite(get(r, 'lon')) && get(r, 'lon') !== '';
    });
    if (!filas.length) return;
    var attrs = ATTR[capa];
    var campos = [{n: 'ID', t: 'C', len: 24}, {n: 'CAPA', t: 'C', len: 12}, {n: 'USUARIO', t: 'C', len: 6}, {n: 'FECHA', t: 'C', len: 19},
      {n: 'LAT', t: 'N', len: 14, dec: 8}, {n: 'LON', t: 'N', len: 14, dec: 8}, {n: 'X_UTM', t: 'N', len: 14, dec: 3}, {n: 'Y_UTM', t: 'N', len: 14, dec: 3},
      {n: 'LECTURAS', t: 'N', len: 5}, {n: 'DURACION_S', t: 'N', len: 4}, {n: 'DISP_M', t: 'N', len: 8, dec: 2}, {n: 'PREC_M', t: 'N', len: 8, dec: 1},
      {n: 'COTA_GPS', t: 'N', len: 9, dec: 1}, {n: 'CALIDAD', t: 'C', len: 80}, {n: 'REF', t: 'C', len: 48}, {n: 'REF_DIST_M', t: 'N', len: 8, dec: 1}];
    attrs.forEach(function (k) {
      var num = !!ATTR_NUM[k];
      campos.push({n: SHP_COLS[k] || k.slice(0, 10).toUpperCase(), t: num ? 'N' : 'C',
        len: num ? 12 : (k === 'observaciones' ? 254 : (k === 'patologias' || k === 'evidencias' ? 120 : 40)), dec: num ? 3 : 0});
    });
    if (capa === 'POZO') campos.push({n: 'N_ENTR', t: 'N', len: 3}, {n: 'N_SAL', t: 'N', len: 3}, {n: 'CONDUCTOS', t: 'C', len: 254});
    campos.push({n: 'N_FOTOS', t: 'N', len: 3});
    var i;
    for (i = 1; i <= MAX_FOTOS_COL; i++) campos.push({n: 'FOTO_' + i, t: 'C', len: 64});
    for (i = 1; i <= MAX_FOTOS_COL; i++) campos.push({n: 'URL_' + i, t: 'C', len: 100});
    var geos = [];
    var datos = filas.map(function (r) {
      var lat = Number(get(r, 'lat')), lon = Number(get(r, 'lon')), u = utm30_(lat, lon);
      geos.push(u);
      var fila = [texto_(get(r, 'id_elemento')), capa, texto_(get(r, 'usuario')), texto_(get(r, 'fecha_hora')), lat, lon, u.x, u.y,
        num_(get(r, 'lecturas')), num_(get(r, 'duracion_s')), num_(get(r, 'dispersion_m')), num_(get(r, 'precision_gps_m')), num_(get(r, 'cota_gps_m')),
        texto_(get(r, 'calidad')), texto_(get(r, 'ref_id')), num_(get(r, 'ref_dist_m'))];
      attrs.forEach(function (k) { fila.push(ATTR_NUM[k] ? num_(get(r, k)) : texto_(get(r, k))); });
      if (capa === 'POZO') fila.push(num_(get(r, 'n_entradas')), num_(get(r, 'n_salidas')), texto_(get(r, 'conductos')));
      var nombres = texto_(get(r, 'fotos')).split(' | ').filter(function (x) { return x; });
      fila.push(nombres.length);
      for (var q = 0; q < MAX_FOTOS_COL; q++) fila.push(nombres[q] || '');
      for (q = 0; q < MAX_FOTOS_COL; q++) fila.push(nombres[q] ? (urls[nombres[q]] || '') : '');
      return fila;
    });
    var nom = SHP_ARCHIVO[capa], g = shp_(geos);
    ficheros.push(aBlob_(g.shp, nom + '.shp'), aBlob_(g.shx, nom + '.shx'), aBlob_(dbf_(campos, datos), nom + '.dbf'),
      Utilities.newBlob(PRJ_25830, 'text/plain', nom + '.prj'), Utilities.newBlob('UTF-8', 'text/plain', nom + '.cpg'));
    resumen[nom] = filas.length;
  });
  if (!ficheros.length) return {carpeta: carp.getUrl(), zip: '', puntos: {}};
  ficheros.push(Utilities.newBlob(
    'Puntos tomados con Campo PDP Balones.\r\nSistema de referencia: ETRS89 / UTM 30N (EPSG:25830).\r\n' +
    'FOTO_1..FOTO_5: nombre del archivo en la carpeta de fotos de Drive. URL_1..URL_5: enlace a la foto en Drive.\r\n' +
    'Generado: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') + '\r\n', 'text/plain', 'LEEME.txt'));
  var zip = Utilities.zip(ficheros.map(function (b) { return b.copyBlob().setName(b.getName()); }), 'Exportacion_QGIS.zip');
  ficheros.concat([zip]).forEach(function (b) {
    var it = carp.getFilesByName(b.getName());
    while (it.hasNext()) it.next().setTrashed(true);
    carp.createFile(b);
  });
  var kml = {};
  try { kml = exportarKml_(carp); } catch (errK) { kml = {error: String(errK && errK.message || errK)}; }
  return {carpeta: carp.getUrl(), zip: carp.getFilesByName('Exportacion_QGIS.zip').next().getUrl(), puntos: resumen, kml: kml};
}

/* ====================== Exportación a KMZ / KML (Google Earth, Mis mapas) ======================
   Se genera junto a los shapefiles, en la misma carpeta «Exportacion QGIS»:
   - Puntos_PDP_Balones.kmz: un solo archivo con las fotos DENTRO (se ven al pinchar sin depender de Drive).
     Si las fotos suman más de KMZ_MAX_MB, las que no caben quedan como enlace a Drive.
   - Puntos_PDP_Balones_enlaces.kml: ligero, con enlaces a las fotos en Drive. Las fotos solo se ven en
     el globo para quien tenga acceso a la carpeta de fotos; el script NO cambia nunca los permisos de Drive. */
var KMZ_MAX_MB = 40;
var KML_ESTILOS = {
  POZO:     {color: 'ffb4781f', icono: 'https://maps.google.com/mapfiles/kml/shapes/placemark_circle.png', carpeta: 'Pozos'},
  IMBORNAL: {color: 'ff007fff', icono: 'https://maps.google.com/mapfiles/kml/shapes/triangle.png', carpeta: 'Imbornales'},
  VERTIDO:  {color: 'ff1c1ae3', icono: 'https://maps.google.com/mapfiles/kml/shapes/placemark_square.png', carpeta: 'Puntos de vertido'}
};
var KML_ETIQ = {
  red: 'Red', tipo: 'Tipo', material: 'Material', forma_tapa: 'Forma de tapa', d_tapa_cm: 'Diámetro tapa (cm)', prof_solera_m: 'Prof. solera (m)',
  estado: 'Estado', sedimentos_pct: 'Sedimentos (%)', accesible: 'Accesible', patologias: 'Patologías', resalto: 'Resalto', prof_resalto_m: 'Prof. resalto (m)',
  alivio: 'Alivio', destino_alivio: 'Destino alivio', acometidas: 'Acometidas', imbornales_conectados: 'Imbornales conectados', observaciones: 'Observaciones',
  tipo_imbornal: 'Tipo', largo_reja_cm: 'Largo reja (cm)', ancho_reja_cm: 'Ancho reja (cm)', material_reja: 'Material reja', sifonico: 'Sifónico',
  obstruccion: 'Obstrucción', conectado_a: 'Conectado a', d_conexion_mm: 'Ø conexión (mm)', prof_m: 'Profundidad (m)',
  tipo_red: 'Tipo de red', estructura: 'Estructura', d_mm: 'Ø (mm)', destino: 'Destino', cauce: 'Cauce', resguardo_m: 'Resguardo (m)', caudal: 'Caudal', evidencias: 'Evidencias'
};
function esc_(s) {
  return String(s === null || s === undefined ? '' : s).replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function archivosFotos_() {
  var m = {}, it = carpeta_().getFiles();
  while (it.hasNext()) { var f = it.next(); m[f.getName()] = f; }
  return m;
}
/* Puntos vigentes de las tres pestañas, con sus atributos ya en texto. */
function puntosKml_() {
  var ss = SpreadsheetApp.getActive(), out = [];
  Object.keys(SHP_ARCHIVO).forEach(function (capa) {
    var h = ss.getSheetByName(capa);
    if (!h || h.getLastRow() < 2) return;
    var v = h.getDataRange().getValues(), cab = v[0], idx = {};
    cab.forEach(function (c, i) { idx[c] = i; });
    var get = function (r, k) { return idx[k] === undefined ? '' : r[idx[k]]; };
    v.slice(1).forEach(function (r) {
      if (get(r, 'estado_registro') === 'ANULADO') return;
      var la = get(r, 'lat'), lo = get(r, 'lon');
      if (la === '' || lo === '' || !isFinite(la) || !isFinite(lo)) return;
      var attrs = [];
      ATTR[capa].forEach(function (k) {
        var t = texto_(get(r, k));
        if (t !== '') attrs.push([KML_ETIQ[k] || k, t]);
      });
      if (capa === 'POZO') {
        var c = texto_(get(r, 'conductos'));
        if (c) attrs.push(['Conductos', c]);
      }
      var datos = [['ID', texto_(get(r, 'id_elemento')), 's'], ['CAPA', capa, 's'], ['USUARIO', texto_(get(r, 'usuario')), 's'],
        ['FECHA', texto_(get(r, 'fecha_hora')), 's'], ['LAT', Number(la), 'n'], ['LON', Number(lo), 'n'],
        ['PREC_M', num_(get(r, 'precision_gps_m')), 'n'], ['CALIDAD', texto_(get(r, 'calidad')), 's'], ['REF', texto_(get(r, 'ref_id')), 's']];
      ATTR[capa].forEach(function (k) {
        datos.push([SHP_COLS[k] || k.slice(0, 10).toUpperCase(), ATTR_NUM[k] ? num_(get(r, k)) : texto_(get(r, k)), ATTR_NUM[k] ? 'n' : 's']);
      });
      if (capa === 'POZO') datos.push(['N_ENTR', num_(get(r, 'n_entradas')), 'n'], ['N_SAL', num_(get(r, 'n_salidas')), 'n'], ['CONDUCTOS', texto_(get(r, 'conductos')), 's']);
      out.push({
        datos: datos,
        capa: capa, id: texto_(get(r, 'id_elemento')), lat: Number(la), lon: Number(lo), usuario: texto_(get(r, 'usuario')),
        fecha: texto_(get(r, 'fecha_hora')), prec: texto_(get(r, 'precision_gps_m')), calidad: texto_(get(r, 'calidad')),
        ref: texto_(get(r, 'ref_id')), attrs: attrs,
        fotos: texto_(get(r, 'fotos')).split(' | ').filter(function (x) { return x; })
      });
    });
  });
  return out;
}
/* modo 'kmz': fotos incrustadas (mapa nombre->true) o enlace si no caben. modo 'enlaces': siempre enlace a Drive. */
function kmlTexto_(puntos, modo, archivos, incrustadas) {
  var x = ['<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>',
    '<name>Puntos PDP Balones</name>',
    '<description>' + esc_('Puntos tomados con Campo PDP Balones. Generado: ' + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm')) + '</description>'];
  Object.keys(KML_ESTILOS).forEach(function (k) {
    var e = KML_ESTILOS[k];
    x.push('<Style id="s' + k + '"><IconStyle><color>' + e.color + '</color><scale>1.1</scale><Icon><href>' + e.icono + '</href></Icon></IconStyle>' +
      '<LabelStyle><scale>0.8</scale></LabelStyle></Style>');
  });
  Object.keys(KML_ESTILOS).forEach(function (capa) {
    var m = puntos.filter(function (p) { return p.capa === capa; })[0];
    if (!m) return;
    var sc = ['<Schema name="' + capa + '" id="d' + capa + '">'];
    m.datos.forEach(function (d) { sc.push('<SimpleField name="' + d[0] + '" type="' + (d[2] === 'n' ? 'double' : 'string') + '"/>'); });
    sc.push('<SimpleField name="N_FOTOS" type="double"/>');
    for (var i = 1; i <= MAX_FOTOS_COL; i++) sc.push('<SimpleField name="FOTO_' + i + '" type="string"/>');
    for (i = 1; i <= MAX_FOTOS_COL; i++) sc.push('<SimpleField name="URL_' + i + '" type="string"/>');
    sc.push('</Schema>');
    x.push(sc.join(''));
  });
  Object.keys(KML_ESTILOS).forEach(function (capa) {
    var lista = puntos.filter(function (p) { return p.capa === capa; });
    if (!lista.length) return;
    x.push('<Folder><name>' + esc_(KML_ESTILOS[capa].carpeta) + ' (' + lista.length + ')</name>');
    lista.forEach(function (p) {
      var d = '<h3>' + esc_(p.id) + '</h3><table border="1" cellpadding="3" cellspacing="0">';
      var fila = function (a, b) { d += '<tr><td><b>' + esc_(a) + '</b></td><td>' + esc_(b) + '</td></tr>'; };
      fila('Capa', KML_ESTILOS[capa].carpeta);
      p.attrs.forEach(function (a) { fila(a[0], a[1]); });
      fila('Fecha', p.fecha); fila('Usuario', p.usuario);
      if (p.prec !== '') fila('Precisión GPS (m)', p.prec);
      if (p.calidad) fila('Calidad', p.calidad);
      if (p.ref) fila('Elemento de referencia', p.ref);
      d += '</table>';
      p.fotos.forEach(function (n) {
        var f = archivos[n];
        if (!f) { d += '<p>Foto ' + esc_(n) + ': no encontrada en la carpeta de fotos.</p>'; return; }
        var enlace = 'https://drive.google.com/file/d/' + f.getId() + '/view';
        if (modo === 'kmz' && incrustadas[n]) {
          d += '<p><img src="files/' + esc_(encodeURIComponent(n)) + '" width="400"/><br/>' + esc_(n) + '</p>';
        } else {
          d += '<p><img src="https://drive.google.com/thumbnail?id=' + f.getId() + '&amp;sz=w800" width="400"/><br/>' +
            '<a href="' + enlace + '">Abrir foto en Drive</a> · ' + esc_(n) + '</p>';
        }
      });
      var ed = ['<ExtendedData><SchemaData schemaUrl="#d' + capa + '">'];
      var sd = function (n, v) { if (v !== '' && v !== null && v !== undefined) ed.push('<SimpleData name="' + n + '">' + esc_(v) + '</SimpleData>'); };
      p.datos.forEach(function (d) { sd(d[0], d[1]); });
      sd('N_FOTOS', p.fotos.length);
      for (var q = 0; q < MAX_FOTOS_COL; q++) {
        var nf = p.fotos[q], ff = nf ? archivos[nf] : null;
        sd('FOTO_' + (q + 1), nf || '');
        sd('URL_' + (q + 1), ff ? 'https://drive.google.com/file/d/' + ff.getId() + '/view' : '');
      }
      ed.push('</SchemaData></ExtendedData>');
      x.push('<Placemark><name>' + esc_(p.id) + '</name><styleUrl>#s' + capa + '</styleUrl>' +
        '<description><![CDATA[' + d.replace(/\]\]>/g, ']]&gt;') + ']]></description>' + ed.join('') +
        '<Point><coordinates>' + p.lon.toFixed(8) + ',' + p.lat.toFixed(8) + ',0</coordinates></Point></Placemark>');
    });
    x.push('</Folder>');
  });
  x.push('</Document></kml>');
  return x.join('\n');
}
function sustituirArchivo_(carp, blob) {
  var it = carp.getFilesByName(blob.getName());
  while (it.hasNext()) it.next().setTrashed(true);
  return carp.createFile(blob);
}
/* Devuelve {kmz, kml, puntos, fotos_incrustadas, fotos_enlace, fotos_sin_archivo} */
function exportarKml_(carp) {
  var puntos = puntosKml_();
  if (!puntos.length) return {puntos: 0};
  var archivos = archivosFotos_(), incrustadas = {}, blobs = [], usado = 0, maxB = KMZ_MAX_MB * 1048576;
  var nEnlace = 0, nSin = 0;
  puntos.forEach(function (p) {
    p.fotos.forEach(function (n) {
      var f = archivos[n];
      if (!f) { nSin++; return; }
      if (incrustadas[n]) return;
      var tam = f.getSize();
      if (usado + tam > maxB) { nEnlace++; return; }
      var b = f.getBlob();
      blobs.push(b.copyBlob().setName('files/' + n));
      incrustadas[n] = true; usado += tam;
    });
  });
  var kmzBlobs = [Utilities.newBlob(kmlTexto_(puntos, 'kmz', archivos, incrustadas), 'application/vnd.google-earth.kml+xml', 'doc.kml')].concat(blobs);
  var kmz = sustituirArchivo_(carp, Utilities.zip(kmzBlobs, 'Puntos_PDP_Balones.kmz'));
  var kml = sustituirArchivo_(carp, Utilities.newBlob(kmlTexto_(puntos, 'enlaces', archivos, {}), 'application/vnd.google-earth.kml+xml', 'Puntos_PDP_Balones_enlaces.kml'));
  return {kmz: kmz.getUrl(), kml: kml.getUrl(), puntos: puntos.length, fotos_incrustadas: Object.keys(incrustadas).length,
    fotos_enlace: nEnlace, fotos_sin_archivo: nSin};
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('Campo PDP').addItem('Exportar a QGIS y Google Earth (SHP, KMZ y KML en Drive)', 'exportarDesdeMenu').addToUi();
  } catch (e) {}
}
function exportarDesdeMenu() {
  var r = exportarQgis(), ui = SpreadsheetApp.getUi();
  var n = Object.keys(r.puntos).map(function (k) { return r.puntos[k] + ' ' + k.toLowerCase(); }).join(', ');
  var k = r.kml || {};
  var t = n ? 'Exportado: ' + n + '.\nCarpeta: ' + r.carpeta : 'No hay puntos vigentes que exportar.';
  if (n) t += k.error ? '\nKMZ/KML no generados: ' + k.error : '\nKMZ con ' + (k.fotos_incrustadas || 0) + ' fotos incrustadas y KML con enlaces.';
  ui.alert(t);
}
