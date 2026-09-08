import fs from "node:fs/promises";
import path from "node:path";

import { slugify } from "../fig/shared-catalog.mjs";
import { validateNormalizedPayload } from "../fig/shared.mjs";
import { repoRoot } from "./shared.mjs";

const FIG_CATALOG_PATH = path.join(repoRoot, "data", "fig", "normalized", "fig-catalog-normalized.json");
const OUTPUT_DIR = path.join(repoRoot, "data", "gesgolf", "imports");
const PROTECTED_CLUB_NAMES = new Set(["mare di roma", "parco de' medici", "parco de’ medici", "parco de medici"]);

const matrix = (...rows) => rows;

const M = {
  acquabona9: matrix([4, 3], [3, 13], [4, 1], [3, 7], [4, 9], [4, 11], [3, 17], [4, 5], [5, 15]),
  altaBadia9: matrix([4, null], [4, null], [4, null], [5, null], [4, null], [4, null], [4, null], [3, null], [4, null]),
  appiano18: matrix([4, 7], [4, 17], [3, 13], [4, 15], [4, 1], [3, 9], [5, 5], [4, 11], [4, 3], [4, 8], [4, 18], [3, 14], [4, 16], [4, 2], [3, 10], [5, 6], [4, 12], [4, 4]),
  carezza9: matrix([4, 9], [5, 4], [3, 6], [4, 8], [4, 2], [4, 3], [4, 5], [4, 1], [3, 7]),
  bergamoBlu: matrix([5, 17], [3, 11], [4, 3], [4, 5], [4, 13], [3, 15], [5, 9], [4, 7], [4, 1]),
  bergamoGiallo: matrix([4, 2], [3, 12], [4, 8], [5, 10], [4, 4], [5, 18], [3, 16], [4, 6], [4, 14]),
  bergamoRosso: matrix([3, 12], [4, 6], [4, 14], [5, 2], [3, 18], [5, 4], [4, 10], [4, 16], [4, 8]),
  botanic9: matrix([4, 6], [5, 4], [4, 9], [3, 1], [4, 8], [4, 7], [5, 5], [3, 2], [4, 3]),
  casalunga18: matrix([4, 3], [5, 7], [4, 13], [3, 9], [4, 1], [3, 15], [4, 11], [5, 5], [3, 17], [4, 4], [5, 8], [4, 14], [3, 10], [4, 2], [3, 16], [4, 12], [5, 6], [3, 18]),
  casalunga9: matrix([4, 2], [5, 4], [4, 7], [3, 5], [4, 1], [3, 8], [4, 6], [5, 3], [3, 9]),
  cerviaBluEven: matrix([4, 14], [4, 16], [4, 8], [5, 6], [3, 10], [5, 4], [4, 2], [3, 12], [4, 18]),
  cerviaBluOdd: matrix([4, 13], [4, 15], [4, 7], [5, 5], [3, 9], [5, 3], [4, 1], [3, 11], [4, 17]),
  cerviaGiallo: matrix([4, 6], [4, 8], [4, 14], [4, 2], [4, 16], [3, 18], [5, 10], [3, 12], [4, 4]),
  cerviaRosso: matrix([4, 5], [4, 1], [5, 3], [4, 11], [3, 17], [5, 7], [4, 13], [3, 9], [4, 15]),
  cosmopolitan18: matrix([5, 17], [4, 5], [3, 15], [4, 7], [4, 9], [3, 11], [4, 3], [4, 13], [5, 1], [3, 16], [4, 2], [4, 4], [4, 14], [4, 6], [5, 8], [4, 18], [3, 12], [5, 10]),
  florinas18: matrix([4, 7], [3, 15], [4, 3], [4, 1], [4, 5], [3, 9], [3, 11], [3, 17], [3, 13], [4, 8], [3, 16], [4, 4], [4, 2], [4, 6], [3, 10], [3, 12], [3, 18], [3, 14]),
  forte18: matrix([5, 10], [4, 12], [3, 6], [4, 8], [3, 16], [5, 14], [4, 4], [4, 2], [4, 18], [4, 7], [4, 13], [3, 11], [4, 1], [3, 17], [5, 9], [4, 5], [4, 3], [4, 15]),
  franciacortaBrut: matrix([5, 6], [4, 10], [4, 12], [4, 2], [3, 8], [5, 14], [4, 16], [4, 4], [3, 18]),
  franciacortaSaten: matrix([5, 15], [3, 17], [4, 9], [5, 11], [4, 13], [4, 3], [3, 7], [4, 5], [4, 1]),
  franciacortaRoseOdd: matrix([3, 7], [4, 5], [5, 3], [4, 17], [4, 11], [3, 13], [3, 15], [4, 9], [4, 1]),
  franciacortaRoseEven: matrix([3, 8], [4, 6], [5, 4], [4, 18], [4, 12], [3, 14], [3, 16], [4, 10], [4, 2]),
  gardaBiancoEven: matrix([4, 8], [5, 18], [4, 4], [4, 2], [3, 14], [4, 10], [5, 16], [3, 12], [4, 6]),
  gardaGiallo: matrix([3, 10], [4, 6], [3, 8], [4, 2], [5, 4], [4, 16], [5, 12], [3, 18], [4, 14]),
  gardaRosso: matrix([4, 3], [3, 17], [5, 9], [4, 7], [5, 11], [4, 5], [4, 13], [4, 1], [3, 15]),
  zerman9: matrix([4, 6], [4, 1], [4, 10], [5, 8], [3, 14], [4, 16], [4, 12], [4, 4], [3, 18]),
  hermitage9: matrix([3, null], [3, null], [4, null], [3, null], [3, null], [3, null], [3, null], [3, null], [3, null]),
  lauri18: matrix([3, 7], [5, 1], [3, 17], [4, 3], [4, 13], [3, 5], [4, 9], [4, 11], [4, 15], [3, 8], [5, 2], [3, 18], [4, 4], [4, 14], [3, 6], [4, 10], [4, 12], [4, 16]),
  livorno9: matrix([3, 4], [4, 5], [3, 2], [3, 1], [3, 8], [3, 7], [3, 3], [3, 9], [3, 6]),
  marigola9: matrix([3, 5], [3, 6], [3, 9], [3, 3], [3, 4], [4, 1], [3, 7], [3, 8], [3, 2]),
  metaponto18: matrix([4, 1], [5, 11], [4, 3], [4, 13], [3, 5], [4, 9], [5, 15], [3, 17], [4, 7], [4, 8], [5, 14], [4, 18], [3, 16], [4, 2], [5, 10], [4, 6], [3, 12], [4, 4]),
  mirabella9: matrix([3, 8], [4, 1], [4, 4], [4, 2], [4, 3], [3, 6], [3, 9], [3, 5], [3, 7])
};

function oddVersion(rows) {
  return rows.map(([par, hcp]) => [par, hcp == null ? null : hcp - 1]);
}

function compressedRanks(rows) {
  const values = rows.map(([, hcp]) => hcp).filter((value) => value != null).sort((a, b) => a - b);
  return rows.map(([par, hcp]) => [par, hcp == null ? null : values.indexOf(hcp) + 1]);
}

function repeated18(rows) {
  const base = compressedRanks(rows);
  return [
    ...base.map(([par, hcp]) => [par, hcp == null ? null : hcp * 2 - 1]),
    ...base.map(([par, hcp]) => [par, hcp == null ? null : hcp * 2])
  ];
}

function concat(...rows) {
  return rows.flat();
}

function segment(rows, start, count) {
  return rows.slice(start, start + count);
}

const CLUBS = [
  {
    figName: "Acquabona", physicalHoleCount: 9, verified: true,
    links: ["https://www.elbagolfacquabona.it/index.html"],
    note: "Il sito ufficiale espone PAR e coppie HCP 1/10-9/18 per tutte le nove buche fisiche.",
    routes: [
      ["18 Buche", "18 Buche", repeated18(M.acquabona9)],
      ["9 Buche", "9 Buche", M.acquabona9]
    ]
  },
  {
    figName: "Alta Badia", physicalHoleCount: 9,
    links: ["https://www.golfaltabadia.it/it/percorso-golf-club-alta-badia"],
    note: "Sito e immagini ufficiali confermano percorso fisico, PAR e distanze; nessuna fonte attendibile espone lo Stroke Index buca per buca.",
    routes: [
      ["18 Buche", "18 Buche", repeated18(M.altaBadia9)],
      ["9 Buche", "9 Buche", M.altaBadia9]
    ]
  },
  {
    figName: "Appiano - Golf & Country", clubName: "Appiano", externalId: "fig-club-appiano", physicalHoleCount: 9,
    links: ["https://www.golfandcountry.it/en/the-blue-monster-golfclub-eppan/", "https://www.golfandcountry.it/wp-content/uploads/2019/08/gceppan-skoresaver-reinz-105x148mm-web.pdf", "https://18birdies.com/golf-courses/club/33adf170-cff8-11ed-a55d-06780482e2ce/eppan-golf-club"],
    note: "Separato dal contenitore FIG Appiano-Carezza. Strokesaver ufficiale verificato pagina per pagina per struttura/PAR; HCP incrociato su scorecard secondaria, quindi resta in revisione.",
    routes: [
      ["18 buche Appiano", "18 Buche - The Blue Monster", M.appiano18],
      ["9 Buche Appiano", "9 Buche - The Blue Monster", segment(M.appiano18, 0, 9)]
    ]
  },
  {
    figName: "Appiano - Golf & Country", clubName: "Carezza", externalId: "fig-club-carezza", physicalHoleCount: 9,
    links: ["https://www.golfandcountry.it/en/the-mountain-beast-golf-club-carezza/", "https://www.allsquaregolf.com/golf-courses/italy/karersee-golf-club-carezza"],
    note: "Separato dal contenitore FIG Appiano-Carezza. Il sito ufficiale conferma il 9 buche fisico; scorecard storiche e correnti divergono su PAR/HCP, quindi resta in revisione.",
    routes: [
      ["18 Buche Carezza", "18 Buche - The Mountain Beast", repeated18(M.carezza9)],
      ["9 Buche Carezza", "9 Buche - The Mountain Beast", M.carezza9]
    ]
  },
  {
    figName: "Bergamo Albenza", physicalHoleCount: 27,
    links: ["https://golfbergamo.club/campo/percorso/"],
    note: "Il sito ufficiale espone le tre matrici da nove buche. L'alternanza HCP del Rosso nella combinazione Rosso-Giallo è ricostruita dalla graduatoria ufficiale ma non mostrata esplicitamente.",
    routeColors: true,
    routes: [
      ["Blu-Giallo", "Blu-Giallo", concat(M.bergamoBlu, M.bergamoGiallo), ["blu", "giallo"]],
      ["Rosso-Blu", "Rosso-Blu", concat(M.bergamoRosso, M.bergamoBlu), ["rosso", "blu"]],
      ["Rosso-Giallo", "Rosso-Giallo", concat(oddVersion(M.bergamoRosso), M.bergamoGiallo), ["rosso", "giallo"]],
      ["Blu", "Blu", M.bergamoBlu, ["blu"]],
      ["Giallo", "Giallo", M.bergamoGiallo, ["giallo"]],
      ["Rosso", "Rosso", M.bergamoRosso, ["rosso"]]
    ]
  },
  {
    figName: "Botanic Sa Cuba", physicalHoleCount: 9,
    links: ["https://www.botanicgolfsacubaresort.it/golf/", "https://18birdies.com/golf-courses/club/b1a64830-cf9a-11eb-bd2c-06780482e2ce/botanic-golf-sacuba"],
    note: "Mappa ufficiale verificata visivamente per il 9 buche fisico; HCP proviene da scorecard secondaria e richiede conferma del club.",
    routes: [
      ["18 Buche", "18 Buche", repeated18(M.botanic9)],
      ["9 Buche", "9 Buche", M.botanic9]
    ]
  },
  {
    figName: "Casalunga", physicalHoleCount: 9,
    links: ["https://casalungagolf.it/"],
    note: "Usata la variante FIG/GesGolf New Storm 2025. Il sito ufficiale conferma il club ma non espone una matrice PAR/HCP completa verificabile.",
    routes: [
      ["18 Buche New Storm 2025", "18 Buche New Storm 2025", M.casalunga18],
      ["9 Buche New Storm 2025", "9 Buche New Storm 2025", M.casalunga9]
    ]
  },
  {
    figName: "Cervia", physicalHoleCount: 27, verified: true,
    links: ["https://www.golfcervia.com/il-campo/"],
    note: "Controllate visivamente tutte le 27 schede GIF ufficiali: PAR e COLPI/HCP dei percorsi Blu, Giallo e Rosso, incluse le coppie del Blu, supportano le tre combinazioni FIG.",
    routes: [
      ["Blu-Giallo", "Blu-Giallo", concat(M.cerviaBluOdd, M.cerviaGiallo), ["blu", "giallo"]],
      ["Giallo-Rosso", "Giallo-Rosso", concat(M.cerviaGiallo, M.cerviaRosso), ["giallo", "rosso"]],
      ["Rosso-Blu", "Rosso-Blu", concat(M.cerviaRosso, M.cerviaBluEven), ["rosso", "blu"]],
      ["9 Buche Blu", "Blu", M.cerviaBluEven, ["blu"]],
      ["9 buche Giallo", "Giallo", M.cerviaGiallo, ["giallo"]],
      ["9 Buche Rosso", "Rosso", M.cerviaRosso, ["rosso"]]
    ]
  },
  {
    figName: "Cosmopolitan", physicalHoleCount: 18, verified: true,
    links: ["https://www.cosmopolitangolf.it/campo"],
    note: "Il sito ufficiale espone PAR e HCP per tutte le 18 buche; struttura e matrice combaciano con FIG.",
    routes: [
      ["18 Buche", "18 Buche", M.cosmopolitan18],
      ["Prime Nove", "Prime Nove", segment(M.cosmopolitan18, 0, 9)],
      ["Seconde Nove", "Seconde Nove", segment(M.cosmopolitan18, 9, 9)]
    ]
  },
  {
    figName: "Florinas", physicalHoleCount: 18, verified: true,
    links: ["https://www.florinasgolf.it/il-campo/", "https://www.florinasgolf.it/wp-content/uploads/2026/04/Stampabile_9buche_PP.pdf"],
    note: "PDF ufficiale estratto e verificato visivamente: la pagina 2 espone l'intera matrice 18 buche Par 62; pubblicata anche la corrispondente prima nove FIG Par 31.",
    routes: [
      ["18 Buche Par 62", "18 Buche Par 62", M.florinas18],
      ["9 Buche Par 31", "9 Buche Par 31", segment(M.florinas18, 0, 9)]
    ]
  },
  {
    figName: "Forte Marmi", physicalHoleCount: 18, verified: true,
    links: ["https://www.versiliagolfresort.com/it/golf-versilia-forte-dei-marmi/percorso"],
    note: "Controllate le 18 immagini ufficiali buca per buca: PAR/HCP completi e coerenti con il Par 71 FIG.",
    routes: [
      ["18 Buche", "18 Buche", M.forte18],
      ["prime 9", "Prime Nove", segment(M.forte18, 0, 9)],
      ["seconde 9", "Seconde Nove", segment(M.forte18, 9, 9)]
    ]
  },
  {
    figName: "Franciacorta", physicalHoleCount: 27, verified: true,
    links: ["https://www.franciacortagolfclub.it/golf/percorsi/"],
    note: "Aperte ed estratte tutte le 27 pagine ufficiali Brut, Satèn e Rosè. Le coppie HCP Rosè sono risolte secondo la combinazione giocata; le varianti provvisorie 2026 restano escluse.",
    routes: [
      ["BRUT+SATEN", "Brut-Satèn", concat(M.franciacortaBrut, M.franciacortaSaten)],
      ["BRUT+ROSE&#39;", "Brut-Rosè", concat(M.franciacortaBrut, M.franciacortaRoseOdd)],
      ["SATEN+ROSE&#39;", "Satèn-Rosè", concat(M.franciacortaSaten, M.franciacortaRoseEven)],
      ["BRUT", "Brut", M.franciacortaBrut],
      ["SATEN", "Satèn", M.franciacortaSaten],
      ["ROSE&#39;", "Rosè", M.franciacortaRoseOdd]
    ]
  },
  {
    figName: "Gardagolf", physicalHoleCount: 27, verified: true,
    links: ["https://gardagolf.it/percorso-bianco/", "https://gardagolf.it/percorso-rosso/", "https://gardagolf.it/percorso-giallo/"],
    note: "Le tre pagine ufficiali espongono PAR/HCP per ogni buca. Per Bianco-Giallo la graduatoria Bianco è trasposta sulla parità complementare mantenendo l'ordine ufficiale.",
    routes: [
      ["Bianco-Rosso", "Bianco-Rosso", concat(M.gardaBiancoEven, M.gardaRosso), ["bianco", "rosso"]],
      ["Rosso-Giallo", "Rosso-Giallo", concat(M.gardaRosso, M.gardaGiallo), ["rosso", "giallo"]],
      ["Bianco-Giallo", "Bianco-Giallo", concat(oddVersion(M.gardaBiancoEven), M.gardaGiallo), ["bianco", "giallo"]],
      ["9 Buche Bianco", "Bianco", M.gardaBiancoEven, ["bianco"]],
      ["9 Buche Rosso", "Rosso", M.gardaRosso, ["rosso"]],
      ["9 Buche Giallo", "Giallo", M.gardaGiallo, ["giallo"]]
    ]
  },
  {
    figName: "Ggz - Zerman", physicalHoleCount: 9,
    links: ["https://www.golfzerman.it/il-percorso/", "https://www.allsquaregolf.com/golf-courses/italy/zerman-golf-club"],
    note: "Il sito ufficiale conferma il 9 buche fisico e il Par 35/70; fonti secondarie divergono su PAR/HCP storici, quindi il club resta in revisione.",
    routes: [
      ["18 Buche", "18 Buche", repeated18(M.zerman9)],
      ["Prime Nove", "Prime Nove", M.zerman9],
      ["Seconde Nove", "Seconde Nove", M.zerman9]
    ]
  },
  {
    figName: "Hermitage", physicalHoleCount: 9,
    links: ["https://www.golfhermitage.it/golf-club-hermitage-il-campo.html", "https://www.golfhermitage.it/assets/golf-hermitage-map.pdf", "https://www.hole19golf.com/courses/golf-club-hermitage"],
    note: "Pagina, mappa PDF e scorecard secondaria confermano 9 buche Par 28 e la buca 3 Par 4; nessuna fonte reperita espone lo Stroke Index.",
    routes: [
      ["18 buche", "18 Buche", repeated18(M.hermitage9)],
      ["9 buche", "9 Buche", M.hermitage9]
    ]
  },
  {
    figName: "Lauri", physicalHoleCount: 9,
    links: ["https://www.golfclubilauri.com/campo/", "https://www.hole19golf.com/courses/golf-club-il-lauri"],
    note: "Il sito ufficiale non espone la scorecard completa; la matrice Hole19 coerente con FIG Par 34/68 è preferita a una seconda scorecard discordante, ma richiede conferma.",
    routes: [
      ["18 buche par 68", "18 Buche", M.lauri18],
      ["9 buche par 34", "9 Buche", segment(M.lauri18, 0, 9)]
    ]
  },
  {
    figName: "Livorno", physicalHoleCount: 9,
    links: ["https://www.golfclublivorno.it/", "https://www.hole19golf.com/courses/golf-club-livorno"],
    note: "FIG e fonti di campo confermano 9 buche Par 28; PAR/HCP sono incrociati su scorecard secondaria perché il sito ufficiale non era consultabile in modo affidabile.",
    routes: [
      ["18 Buche", "18 Buche", repeated18(M.livorno9)],
      ["9 Buche", "9 Buche", M.livorno9]
    ]
  },
  {
    figName: "Marigola", physicalHoleCount: 9,
    links: ["https://golfmarigola.it/il-campo/", "https://www.allsquaregolf.com/golf-courses/italy/circolo-golf-marigola"],
    note: "FIG corrente indica Par 28 mentre la scorecard secondaria conserva Par 27; applicato il Par 4 alla buca 6 coerente con lunghezza e totale FIG, ma il dato resta da confermare.",
    routes: [
      ["18 BUCHE", "18 Buche", repeated18(M.marigola9)],
      ["9 BUCHE", "9 Buche", M.marigola9]
    ]
  },
  {
    figName: "Metaponto", physicalHoleCount: 18, verified: true,
    links: ["https://metapontogolf.it/it/golf/percorso-003.html", "https://www.metapontogolf.it/gestione.php?fileid=58&id=download"],
    note: "Il percorso dettagliato ufficiale espone PAR/HCP per tutte le 18 buche: la matrice coincide integralmente con il percorso FIG Par 72 e con i segmenti Prime/Seconde Nove.",
    routes: [
      ["18 buche", "18 Buche", M.metaponto18],
      ["Prime Nove", "Prime Nove", segment(M.metaponto18, 0, 9)],
      ["Seconde Nove", "Seconde Nove", segment(M.metaponto18, 9, 9)]
    ]
  },
  {
    figName: "Mirabella", physicalHoleCount: 9,
    links: ["https://www.mirabellagolfclub.com/", "http://www.mirabellagolfclub.com/wp-content/uploads/2020/02/Schemi-buche.pdf", "https://www.allsquaregolf.com/golf-courses/italy/mirabella-golf-club"],
    note: "PDF ufficiale verificato visivamente per le nove buche fisiche Par 31 e i due giri; HCP proviene da scorecard secondaria e richiede conferma.",
    routes: [
      ["18 Buche", "18 Buche", repeated18(M.mirabella9)],
      ["Prime Nove", "9 Buche", M.mirabella9]
    ]
  }
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function normalizeClubName(name) {
  return String(name).trim().toLowerCase();
}

function findFigClub(catalog, name) {
  const club = catalog.clubs.find((candidate) => candidate.name === name);
  assert(club, `Club FIG non trovato: ${name}`);
  assert(!PROTECTED_CLUB_NAMES.has(normalizeClubName(club.name)), `Club protetto: ${club.name}`);
  return club;
}

function findFigCourse(figClub, name) {
  const course = figClub.playable_courses.find((candidate) => candidate.name === name);
  assert(course, `Percorso FIG non trovato per ${figClub.name}: ${name}`);
  return course;
}

function teePayload(figCourse) {
  return (figCourse.tees || []).map((tee) => ({
    tee_name: tee.tee_name,
    tee_color: tee.tee_color || null,
    gender: tee.gender || null,
    course_rating: tee.course_rating ?? null,
    slope_rating: tee.slope_rating ?? null,
    par_total: tee.par_total ?? figCourse.total_par ?? null,
    is_active: tee.is_active ?? true,
    source_system: "fig",
    source_external_id: tee.source_external_id,
    source_payload: { ...(tee.source_payload || {}), official_catalog: "fig" }
  }));
}

function routeHoles(rows) {
  return rows.map(([par, strokeIndex], index) => ({
    physical_hole_number: index + 1,
    par,
    stroke_index: strokeIndex,
    display_label: String(index + 1)
  }));
}

function validateMatrix(config, figCourse, rows) {
  assert(rows.length === figCourse.holes_count, `${config.clubName || config.figName} / ${figCourse.name}: numero buche non coerente`);
  const par = rows.reduce((sum, [value]) => sum + value, 0);
  assert(par === figCourse.total_par, `${config.clubName || config.figName} / ${figCourse.name}: Par ${par} != FIG ${figCourse.total_par}`);
  const indexes = rows.map(([, value]) => value).filter((value) => value != null);
  assert(new Set(indexes).size === indexes.length, `${config.clubName || config.figName} / ${figCourse.name}: HCP duplicati`);
  if (rows.length === 18 && indexes.length === 18) {
    assert(Math.min(...indexes) === 1 && Math.max(...indexes) === 18, `${config.clubName || config.figName} / ${figCourse.name}: matrice HCP 18 incompleta`);
  }
}

function buildRoute(config, figClub, routeSpec, displayOrder) {
  const [figCourseName, name, rows, routeColorKeys] = routeSpec;
  const figCourse = findFigCourse(figClub, figCourseName);
  validateMatrix(config, figCourse, rows);

  return {
    external_key: figCourse.source_external_id,
    name,
    holes_count: figCourse.holes_count,
    total_par: figCourse.total_par,
    display_order: displayOrder,
    is_active: figCourse.is_active ?? true,
    source_system: "fig",
    source_external_id: figCourse.source_external_id,
    source_payload: {
      kind: "route",
      official_catalog: "fig",
      hole_by_hole_source: config.verified ? "official_club_evidence" : "official_plus_secondary_review",
      fig_display_name: figCourse.name,
      ...(routeColorKeys ? { route_color_keys: routeColorKeys } : {}),
      round_variant: {
        holes_count: figCourse.holes_count,
        default_for_holes: displayOrder === 1 ? figCourse.holes_count : null,
        default_source: "fig_official_web_batch_2026_09_08"
      },
      evidence_links: config.links,
      evidence_note: config.note
    },
    holes: routeHoles(rows),
    tees: teePayload(figCourse)
  };
}

async function main() {
  const catalog = JSON.parse(await fs.readFile(FIG_CATALOG_PATH, "utf8"));
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const outputs = [];

  for (const config of CLUBS) {
    const figClub = findFigClub(catalog, config.figName);
    const clubName = config.clubName || figClub.name;
    assert(!PROTECTED_CLUB_NAMES.has(normalizeClubName(clubName)), `Club protetto: ${clubName}`);
    const routes = config.routes.map((routeSpec, index) => buildRoute(config, figClub, routeSpec, index + 1));
    const payload = {
      schema_version: "1.0",
      source: {
        system: "fig_official_web",
        scraped_at: new Date().toISOString(),
        club_external_id: config.externalId || figClub.source_external_id,
        notes: `FIG + controllo terzo livello 2026-09-08 per ${clubName}`
      },
      club: {
        name: clubName,
        name_normalized: slugify(clubName).replaceAll("-", " "),
        city: figClub.city || null,
        country: figClub.country || "Italia",
        data_status: config.verified ? "verified" : "needs_review",
        source_type: "fig_import",
        is_complex: config.physicalHoleCount > 18 || config.routes.length > 3,
        playable: true,
        is_active: figClub.is_active ?? true,
        source_system: "fig",
        source_external_id: config.externalId || figClub.source_external_id,
        source_payload: {
          ...(figClub.source_payload || {}),
          official_catalog: "fig",
          original_fig_club_name: figClub.name,
          verification_status: config.verified ? "verified" : "playable_review",
          ...(config.verified ? { stablr_approved: true } : {}),
          website_evidence_status: config.verified ? "verified" : "deep_review_completed_with_open_issue",
          official_course_links: config.links,
          verification_notes: config.note,
          physical_hole_count: config.physicalHoleCount,
          import_profile: "fig_official_web_third_level",
          product_rule: "Pubblicare solo i percorsi esplicitamente mappati; escludere duplicati, provvisori e varianti non confermate."
        }
      },
      routes,
      route_combinations: []
    };

    validateNormalizedPayload(payload);
    const outputPath = path.join(OUTPUT_DIR, `${slugify(clubName)}-normalized.json`);
    await fs.writeFile(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    outputs.push({ club: clubName, status: payload.club.data_status, routes: routes.length, output: path.relative(repoRoot, outputPath) });
  }

  assert(outputs.length === 20, `Il lotto deve contenere 20 club, trovati ${outputs.length}`);
  console.log(JSON.stringify(outputs, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
