/* ═══════════════════════════════════════════════════════
   GeoQuiz — Map Data (Accurate GeoJSON via world‑atlas)
   Loads Natural Earth 50m country boundaries from CDN,
   projects them to SVG coordinates, and provides game
   query helpers and microstate center points.
   ═══════════════════════════════════════════════════════ */

// ── Data source (Natural Earth 10m via world‑atlas CDN for maximum accuracy) ──
const WORLD_ATLAS_URL =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-10m.json';

// ── SVG canvas defaults ──
const SVG_W = 1000;
const SVG_H = 700;
const SVG_PAD = 30; // generous padding for clear visualization

// ── Continent configurations with custom viewports (Zoom & Panning overlays) ────────────────────────────
const CONTINENTS = {
  europe:          { name:'Europa',       emoji:'🌍', color:'#3b82f6',
                     bounds:{minLon:-25,maxLon:45, minLat:34,maxLat:71},
                     zoom: 2.8, panX: -870, panY: 150 },
  asia:            { name:'Asia',         emoji:'🌏', color:'#f59e0b',
                     bounds:{minLon:24,maxLon:145, minLat:-11,maxLat:56},
                     zoom: 2.0, panX: -1050, panY: 50 },
  africa:          { name:'Africa',       emoji:'🌍', color:'#10b981',
                     bounds:{minLon:-20,maxLon:53, minLat:-35,maxLat:38},
                     zoom: 1.8, panX: -760, panY: -280 },
  'north-america': { name:'Nord America', emoji:'🌎', color:'#ef4444',
                     bounds:{minLon:-168,maxLon:-52,minLat:7,maxLat:83},
                     zoom: 1.7, panX: -100, panY: 100 },
  'south-america': { name:'Sud America',  emoji:'🌎', color:'#8b5cf6',
                     bounds:{minLon:-82,maxLon:-34,minLat:-56,maxLat:13},
                     zoom: 1.8, panX: -260, panY: -580 },
  oceania:         { name:'Oceania',      emoji:'🌏', color:'#06b6d4',
                     bounds:{minLon:110,maxLon:180,minLat:-48,maxLat:1},
                     zoom: 1.8, panX: -1280, panY: -580 },
  world:           { name:'Mondo',        emoji:'🌐', color:'#ec4899',
                     bounds:{minLon:-180,maxLon:180,minLat:-58,maxLat:84},
                     zoom: 1.0, panX: 0, panY: 0 }
};

/* ── Country metadata ────────────────────────────────────
   Key   = ISO 3166‑1 *numeric* code (integer)
   Value = [italianName, iso‑alpha‑2, continentKey, difficulty]
   difficulty: 0 = territory / not playable
               1 = easy, 2 = medium, 3 = hard                       */
const COUNTRY_META = {
  // ── Europe ──
  8:['Albania','AL','europe',3],
  40:['Austria','AT','europe',2],
  112:['Bielorussia','BY','europe',3],
  56:['Belgio','BE','europe',3],
  70:['Bosnia ed Erzeg.','BA','europe',3],
  100:['Bulgaria','BG','europe',2],
  191:['Croazia','HR','europe',3],
  196:['Cipro','CY','europe',3],
  203:['Rep. Ceca','CZ','europe',2],
  208:['Danimarca','DK','europe',3],
  233:['Estonia','EE','europe',3],
  246:['Finlandia','FI','europe',2],
  250:['Francia','FR','europe',1],
  276:['Germania','DE','europe',1],
  300:['Grecia','GR','europe',1],
  348:['Ungheria','HU','europe',2],
  352:['Islanda','IS','europe',3],
  372:['Irlanda','IE','europe',2],
  380:['Italia','IT','europe',1],
  428:['Lettonia','LV','europe',3],
  440:['Lituania','LT','europe',3],
  498:['Moldavia','MD','europe',3],
  499:['Montenegro','ME','europe',3],
  528:['Paesi Bassi','NL','europe',2],
  807:['Macedonia del Nord','MK','europe',3],
  578:['Norvegia','NO','europe',2],
  616:['Polonia','PL','europe',1],
  620:['Portogallo','PT','europe',1],
  642:['Romania','RO','europe',2],
  643:['Russia','RU','europe',1],
  688:['Serbia','RS','europe',3],
  703:['Slovacchia','SK','europe',3],
  705:['Slovenia','SI','europe',3],
  724:['Spagna','ES','europe',1],
  752:['Svezia','SE','europe',2],
  756:['Svizzera','CH','europe',2],
  804:['Ucraina','UA','europe',2],
  826:['Regno Unito','GB','europe',1],

  // ── Europe Microstates ──
  20:['Andorra','AD','europe',3],
  438:['Liechtenstein','LI','europe',3],
  442:['Lussemburgo','LU','europe',2],
  470:['Malta','MT','europe',3],
  492:['Monaco','MC','europe',3],
  674:['San Marino','SM','europe',3],
  336:['Vaticano','VA','europe',3],

  // ── Asia ──
  4:['Afghanistan','AF','asia',3],
  51:['Armenia','AM','asia',3],
  31:['Azerbaigian','AZ','asia',3],
  50:['Bangladesh','BD','asia',3],
  64:['Bhutan','BT','asia',3],
  96:['Brunei','BN','asia',3],
  116:['Cambogia','KH','asia',3],
  156:['Cina','CN','asia',1],
  268:['Georgia','GE','asia',3],
  356:['India','IN','asia',1],
  360:['Indonesia','ID','asia',1],
  364:['Iran','IR','asia',1],
  368:['Iraq','IQ','asia',2],
  376:['Israele','IL','asia',3],
  392:['Giappone','JP','asia',1],
  400:['Giordania','JO','asia',3],
  398:['Kazakistan','KZ','asia',2],
  414:['Kuwait','KW','asia',3],
  417:['Kirghizistan','KG','asia',3],
  418:['Laos','LA','asia',3],
  422:['Libano','LB','asia',3],
  458:['Malesia','MY','asia',2],
  496:['Mongolia','MN','asia',2],
  104:['Myanmar','MM','asia',2],
  524:['Nepal','NP','asia',3],
  408:['Corea del Nord','KP','asia',2],
  512:['Oman','OM','asia',3],
  586:['Pakistan','PK','asia',2],
  608:['Filippine','PH','asia',2],
  634:['Qatar','QA','asia',3],
  682:['Arabia Saudita','SA','asia',1],
  410:['Corea del Sud','KR','asia',1],
  144:['Sri Lanka','LK','asia',3],
  760:['Siria','SY','asia',3],
  158:['Taiwan','TW','asia',3],
  762:['Tagikistan','TJ','asia',3],
  764:['Thailandia','TH','asia',1],
  626:['Timor Est','TL','asia',3],
  792:['Turchia','TR','asia',1],
  795:['Turkmenistan','TM','asia',3],
  784:['Emirati Arabi','AE','asia',3],
  860:['Uzbekistan','UZ','asia',3],
  704:['Vietnam','VN','asia',2],
  887:['Yemen','YE','asia',3],

  // ── Asia Microstates ──
  702:['Singapore','SG','asia',3],
  48:['Bahrein','BH','asia',3],
  462:['Maldive','MV','asia',3],

  // ── Africa ──
  12:['Algeria','DZ','africa',2],
  24:['Angola','AO','africa',2],
  204:['Benin','BJ','africa',3],
  72:['Botswana','BW','africa',3],
  854:['Burkina Faso','BF','africa',3],
  108:['Burundi','BI','africa',3],
  120:['Camerun','CM','africa',2],
  140:['Rep. Centrafricana','CF','africa',3],
  148:['Ciad','TD','africa',3],
  178:['Rep. del Congo','CG','africa',3],
  180:['R.D. del Congo','CD','africa',1],
  384:["Costa d'Avorio",'CI','africa',3],
  262:['Gibuti','DJ','africa',3],
  818:['Egitto','EG','africa',1],
  226:['Guinea Equat.','GQ','africa',3],
  232:['Eritrea','ER','africa',3],
  748:['Eswatini','SZ','africa',3],
  231:['Etiopia','ET','africa',1],
  266:['Gabon','GA','africa',3],
  270:['Gambia','GM','africa',3],
  288:['Ghana','GH','africa',2],
  324:['Guinea','GN','africa',3],
  624:['Guinea-Bissau','GW','africa',3],
  404:['Kenya','KE','africa',1],
  426:['Lesotho','LS','africa',3],
  430:['Liberia','LR','africa',3],
  434:['Libia','LY','africa',2],
  450:['Madagascar','MG','africa',2],
  454:['Malawi','MW','africa',3],
  466:['Mali','ML','africa',3],
  478:['Mauritania','MR','africa',3],
  504:['Marocco','MA','africa',1],
  508:['Mozambico','MZ','africa',2],
  516:['Namibia','NA','africa',2],
  562:['Niger','NE','africa',3],
  566:['Nigeria','NG','africa',1],
  646:['Ruanda','RW','africa',3],
  686:['Senegal','SN','africa',3],
  694:['Sierra Leone','SL','africa',3],
  706:['Somalia','SO','africa',2],
  710:['Sudafrica','ZA','africa',1],
  728:['Sud Sudan','SS','africa',3],
  729:['Sudan','SD','africa',2],
  834:['Tanzania','TZ','africa',2],
  768:['Togo','TG','africa',3],
  788:['Tunisia','TN','africa',3],
  800:['Uganda','UG','africa',3],
  894:['Zambia','ZM','africa',3],
  716:['Zimbabwe','ZW','africa',3],

  // ── Africa Microstates ──
  690:['Seychelles','SC','africa',3],
  480:['Mauritius','MU','africa',3],
  132:['Capo Verde','CV','africa',3],

  // ── North America ──
  44:['Bahamas','BS','north-america',3],
  84:['Belize','BZ','north-america',3],
  124:['Canada','CA','north-america',1],
  188:['Costa Rica','CR','north-america',2],
  192:['Cuba','CU','north-america',1],
  214:['Rep. Dominicana','DO','north-america',3],
  222:['El Salvador','SV','north-america',3],
  320:['Guatemala','GT','north-america',2],
  332:['Haiti','HT','north-america',3],
  340:['Honduras','HN','north-america',2],
  388:['Giamaica','JM','north-america',3],
  484:['Messico','MX','north-america',1],
  558:['Nicaragua','NI','north-america',2],
  591:['Panama','PA','north-america',2],
  780:['Trinidad e Tobago','TT','north-america',3],
  840:['Stati Uniti','US','north-america',1],

  // ── North America Microstates ──
  52:['Barbados','BB','north-america',3],

  // ── South America ──
  32:['Argentina','AR','south-america',1],
  68:['Bolivia','BO','south-america',2],
  76:['Brasile','BR','south-america',1],
  152:['Cile','CL','south-america',1],
  170:['Colombia','CO','south-america',1],
  218:['Ecuador','EC','south-america',2],
  328:['Guyana','GY','south-america',3],
  600:['Paraguay','PY','south-america',2],
  604:['Perù','PE','south-america',1],
  740:['Suriname','SR','south-america',3],
  858:['Uruguay','UY','south-america',2],
  862:['Venezuela','VE','south-america',1],

  // ── Oceania ──
  36:['Australia','AU','oceania',1],
  242:['Figi','FJ','oceania',3],
  554:['Nuova Zelanda','NZ','oceania',1],
  598:['Papua Nuova Guinea','PG','oceania',2],
  90:['Isole Salomone','SB','oceania',3],
  548:['Vanuatu','VU','oceania',3],
  882:['Samoa','WS','oceania',3],
  776:['Tonga','TO','oceania',3],
  583:['Micronesia','FM','oceania',3],
  585:['Palau','PW','oceania',3],
  296:['Kiribati','KI','oceania',3],
  798:['Tuvalu','TV','oceania',3],
  520:['Nauru','NR','oceania',3],
  584:['Isole Marshall','MH','oceania',3],


  // ── Territories (difficulty 0 → not playable) ──
  304:['Groenlandia','GL','north-america',0],
  732:['Sahara Occ.','EH','africa',0],
  254:['Guyana Francese','GF','south-america',0],
  10:['Antartide','AQ','world',0],
  540:['Nuova Caledonia','NC','oceania',0],
  630:['Porto Rico','PR','north-america',0]
};

// ── Microstates Coordinates (Longitude, Latitude) ───────
// Placed precisely at the center point of each microstate
const MICROSTATE_COORDS = {
  // Europe
  20:  [1.5218, 42.5063],   // Andorra
  336: [12.4534, 41.9029],  // Vaticano
  438: [9.5209, 47.1410],   // Liechtenstein
  442: [6.1296, 49.8153],   // Lussemburgo
  470: [14.3754, 35.9375],  // Malta
  492: [7.4246, 43.7384],   // Monaco
  674: [12.4578, 43.9424],  // San Marino
  
  // Asia
  702: [103.8198, 1.3521],  // Singapore
  48:  [50.5577, 26.0667],  // Bahrein
  462: [73.5093, 3.2028],   // Maldive

  // Africa
  690: [55.4920, -4.6796],  // Seychelles
  480: [57.5522, -20.3484], // Mauritius
  132: [-23.0418, 16.5388], // Capo Verde

  // North America
  52:  [-59.5432, 13.1939],  // Barbados
  
  // Oceania Microstates
  882: [-172.1046, -13.7590],  // Samoa
  776: [-175.1982, -21.1789],  // Tonga
  583: [158.1560, 6.9180],     // Micronesia
  585: [134.5825, 7.5150],     // Palau
  296: [172.9717, 1.4518],     // Kiribati
  798: [179.1940, -8.5338],    // Tuvalu
  520: [166.9315, -0.5228],    // Nauru
  584: [171.1848, 7.1315]      // Isole Marshall
};


// Array of all IDs defined as custom microstate circles
const MICROSTATE_IDS = Object.keys(MICROSTATE_COORDS).map(Number);

/* Legacy / alternate numeric codes that Natural Earth may use */
const ALT_CODES = { 736:729 }; // old Sudan → new

// ── Flag emoji from ISO alpha‑2 ─────────────────────────
function isoToFlag(code){
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map(c=>0x1F1E6+c.charCodeAt(0)-65));
}

// ── Lookup helpers ──────────────────────────────────────
function parseMeta(id){
  const m = COUNTRY_META[id];
  if(!m) return null;
  return { nameIt:m[0], iso2:m[1], continent:m[2], difficulty:m[3],
           flag:isoToFlag(m[1]) };
}

function getCountryMeta(featureId){
  let n = Number(featureId);
  if(ALT_CODES[n]) n = ALT_CODES[n];
  const meta = parseMeta(n);
  return meta ? { id:n, ...meta } : null;
}

// ── Global storage (populated by loadWorldData) ─────────
let allFeatures      = [];   // raw GeoJSON features
let countryMap       = {};   // featureId → { meta, feature }
let availableCountries = []; // playable entries

// ── Load world topology from CDN ────────────────────────
async function loadWorldData(){
  const res = await fetch(WORLD_ATLAS_URL);
  if(!res.ok) throw new Error('Impossibile caricare i dati della mappa');
  const topo = await res.json();
  const geo  = topojson.feature(topo, topo.objects.countries);
  allFeatures = geo.features;

  countryMap = {};
  availableCountries = [];
  
  // 1. Process regular countries from GeoJSON
  allFeatures.forEach(f=>{
    const meta = getCountryMeta(f.id);
    if(!meta) return;
    const entry = { ...meta, feature:f };
    countryMap[meta.id] = entry;
  });

  // 2. Synthesize entries for microstates that might not have a polygon in GeoJSON
  // but are crucial to be playable.
  Object.keys(COUNTRY_META).forEach(idStr => {
    const id = Number(idStr);
    const meta = parseMeta(id);
    if (!meta || meta.difficulty === 0) return;

    // Check if we already have it from the GeoJSON. If not, we still make it playable
    if (!countryMap[id]) {
      const entry = {
        id: id,
        ...meta,
        feature: {
          type: "Feature",
          id: id,
          geometry: {
            type: "Point",
            coordinates: MICROSTATE_COORDS[id] || [0, 0]
          }
        }
      };
      countryMap[id] = entry;
    }
    
    // Add to active playable countries list if not already there
    if (!availableCountries.find(c => c.id === id)) {
      availableCountries.push(countryMap[id]);
    }
  });

  return geo;
}

// ── Query helpers ───────────────────────────────────────
function getCountriesByContinent(key){
  if(key==='world') return availableCountries;
  return availableCountries.filter(c=>c.continent===key);
}

function getCountriesForGame(key, diff){
  const dn = diff==='easy'?1 : diff==='medium'?2 : 3;
  return getCountriesByContinent(key).filter(c=>c.difficulty<=dn);
}

// ── Equirectangular projection (ALWAYS GLOBALLY STABLE USING WORLD BOUNDARIES) ──
function createProjection(continentKey){
  // We ALWAYS use the global 'world' boundaries for projection,
  // ensuring the coordinates system is 100% stable and predictable!
  const {minLon,maxLon,minLat,maxLat} = CONTINENTS['world'].bounds;
  const gW = maxLon-minLon, gH = maxLat-minLat;
  const sX = (SVG_W-2*SVG_PAD)/gW, sY = (SVG_H-2*SVG_PAD)/gH;
  const s  = Math.min(sX,sY);
  const oX = (SVG_W - gW*s)/2, oY = (SVG_H - gH*s)/2;
  return ([lon,lat])=>[
    Math.round(((lon-minLon)*s + oX)*100)/100,
    Math.round(((maxLat-lat)*s + oY)*100)/100
  ];
}

// ── GeoJSON geometry → SVG <path> d‑attribute ───────────
function geometryToPath(geometry, proj){
  if(!geometry||!geometry.coordinates) return '';
  if(geometry.type === 'Point') return ''; // points are drawn as circles separately
  
  function ring(r){
    let d='';
    for(let i=0;i<r.length;i++){
      const [x,y]=proj(r[i]);
      d+=(i?'L':'M')+x+','+y;
    }
    return d+'Z';
  }
  if(geometry.type==='Polygon')
    return geometry.coordinates.map(ring).join(' ');
  if(geometry.type==='MultiPolygon')
    return geometry.coordinates.flatMap(p=>p.map(ring)).join(' ');
  return '';
}

// ── Centroid of the largest polygon (for labels / microstate marker positioning) ──
function geometryCentroid(geometry, proj){
  if (!geometry) return [0,0];
  if (geometry.type === 'Point') {
    return proj(geometry.coordinates);
  }
  
  let coords;
  if(geometry.type==='Polygon'){
    coords = geometry.coordinates[0];
  } else if(geometry.type==='MultiPolygon'){
    let best=null, bestLen=0;
    geometry.coordinates.forEach(p=>{
      if(p[0].length>bestLen){ bestLen=p[0].length; best=p[0]; }
    });
    coords=best||[];
  } else return [0,0];
  let tx=0,ty=0;
  coords.forEach(c=>{ const [x,y]=proj(c); tx+=x; ty+=y; });
  return [tx/coords.length, ty/coords.length];
}

// ── Bounding Box of the geometry in SVG canvas space ──
function getGeometryBBox(geometry, proj){
  if (!geometry || !geometry.coordinates) return null;
  if (geometry.type === 'Point') {
    const [x, y] = proj(geometry.coordinates);
    return { x: x - 5, y: y - 5, width: 10, height: 10 };
  }
  
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  function update(pt) {
    const [x, y] = proj(pt);
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }

  if (geometry.type === 'Polygon') {
    geometry.coordinates.forEach(ring => ring.forEach(update));
  } else if (geometry.type === 'MultiPolygon') {
    geometry.coordinates.forEach(poly => poly.forEach(ring => ring.forEach(update)));
  }

  if (minX === Infinity) return null;
  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY)
  };
}

