/* Campo PDP Balones · servidor (Google Apps Script vinculado a la hoja de cálculo)
   Implementar como aplicación web: Ejecutar como YO · Acceso: cualquier usuario.
   Antes de implementar, ejecutar UNA vez la función autorizarDrive(). */

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
  if (q === 'probarfoto') {
    try { return json_({ok: true, carpeta: carpeta_().getUrl()}); }
    catch (err) { return json_({ok: false, error: String(err.message || err)}); }
  }
  return json_({ok: true, servicio: 'Campo PDP Balones', hora: new Date().toISOString()});
}
