# Bergamo Albenza — verifica della parità Rosso-Giallo

Data: 2026-09-09. Operatore: Codex, su richiesta del product owner.
Esito: club invariato `needs_review` / `playable_review`, nessuna promozione o modifica live.

## Fonti e perimetro

- [Scorecard ufficiali](https://golfbergamo.club/campo/percorso/): pagina già consultata nel cross-check di questa sessione; matrici complete nuovamente fornite dall'utente.
- [Regolamento ufficiale](https://golfbergamo.club/club/regolamento/): consultazione mirata, conferma Rosso iniziale Par 3, Blu Par 5, Giallo Par 4. Identifica i segmenti ma non prescrive la parità HCP della combinazione Rosso-Giallo.
- Catalogo locale `data/fig/normalized/fig-catalog-normalized.json` e import `data/gesgolf/imports/bergamo-albenza-normalized.json`.
- Builder `scripts/gesgolf/build-import-batch-2026-09-08.mjs`, funzioni `oddVersion` e `concat`.
- Nessuna matrice GesGolf diretta di Bergamo Albenza disponibile nel repository secondo il precedente inventario locale. `Colli Bergamo` è un'altra entità. Matching GesGolf non verificabile, non dichiarato positivo.
- Nessuna nuova ricerca generale o riesame di altri club.

## Confronto delle sei route attive

| Route FIG | PAR | HCP rispetto all'evidenza ufficiale | Risultato |
| --- | --- | --- | --- |
| Blu | 9/36, 9 valori identici | `17,11,3,5,13,15,9,7,1`, 9/9 identici | Matrice base corroborata |
| Giallo | 9/36, 9 valori identici | `2,12,8,10,4,18,16,6,14`, 9/9 identici | Matrice base corroborata |
| Rosso | 9/36, 9 valori identici | `12,6,14,2,18,4,10,16,8`, 9/9 identici | Matrice base corroborata |
| Blu-Giallo | 18/72, concatenazione esatta | Blu originale + Giallo originale, indici unici 1–18 | Nessuna trasformazione numerica |
| Rosso-Blu | 18/72, concatenazione esatta | Rosso originale + Blu originale, indici unici 1–18 | Nessuna trasformazione numerica |
| Rosso-Giallo | 18/72, concatenazione esatta | Rosso meno 1 + Giallo originale | Trasformazione riproducibile, attribuzione della parità non confermata |

Tutte le route sono associate ai rispettivi `fig-course-bergamo-albenza-*`. FIG conferma Rosso-Giallo e i suoi sei tee ratingati (per esempio Giallo CR 71.1 / Slope 133). Questi rating non contengono la distribuzione HCP buca per buca.

## Perché deterministico non significa univocamente dimostrato

Il builder costruisce Rosso-Giallo con `concat(oddVersion(M.bergamoRosso), M.bergamoGiallo)`; `oddVersion` sottrae 1 da ciascun HCP. Nell'import la combinazione è una route di 18 buche in `routes`, non un elemento di `route_combinations` (array vuoto).

Sequenza importata:

```text
Rosso:  11,5,13,1,17,3,9,15,7
Giallo: 2,12,8,10,4,18,16,6,14
```

La concatenazione delle due matrici ufficiali senza trasformazioni duplicherebbe ciascun indice pari e non avrebbe indici dispari. Il builder risolve la duplicazione preservando l'ordine interno di difficoltà; tuttavia le fonti disponibili non prescrivono di trasformare proprio Rosso.

Controesempio matematico, non proposta di modifica: mantenere Rosso e sottrarre 1 a Giallo produrrebbe anch'esso tutti gli indici 1–18, senza duplicati e con le medesime graduatorie interne:

```text
Rosso:  12,6,14,2,18,4,10,16,8
Giallo: 1,11,7,9,3,17,15,5,13
```

L'ordine del nome della combinazione non risolve da solo la questione: l'altra route importata Rosso-Blu conserva Rosso pari anche se giocato per primo. L'esistenza di `oddVersion` e il suo utilizzo in altre configurazioni del builder non costituiscono una regola ufficiale o un'autorizzazione generale della governance a scegliere la parità.

## Decisione e informazione mancante

Applicati Governance Framework v3 §13 (Evaluate), §14 (nessuna assunzione sulle combinazioni) e §16 (SI completi/coerenti, evidenza sufficiente). La matrice passa i controlli numerici ma la certificazione di Rosso-Giallo resta sospesa: serve una scorecard specifica della combinazione, oppure una regola/conferma del club che assegni Rosso dispari e Giallo pari conservando le graduatorie pubblicate.

L'assenza di GesGolf non è di per sé un veto al verde: una prova ufficiale sufficiente può bastare. Qui manca precisamente l'attribuzione degli HCP alla combinazione.

Il club resta arancione, senza un nuovo blocco di giocabilità. Le altre cinque route restano corroborate, senza nuove certificazioni applicate in questo task. La governance opera per playable course: il badge club aggregato non deve essere interpretato come un divieto generale di certificazione parziale, né questa verifica dichiara implementata tale certificazione.

## Validazioni

- `validateNormalizedPayload`: import Bergamo valido.
- Confronto con assertion su tutte le sei route: PAR hole-by-hole, HCP originali/trasformati, numero buche e totale FIG, unicità degli SI.
- Nessuna rigenerazione del batch, modifica import, seed o scrittura al database remoto.
