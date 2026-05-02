# Graph Report - BGManager  (2026-05-02)

## Corpus Check
- 98 files · ~78,930 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 391 nodes · 334 edges · 52 communities detected
- Extraction: 84% EXTRACTED · 16% INFERRED · 0% AMBIGUOUS · INFERRED: 54 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 107|Community 107]]
- [[_COMMUNITY_Community 108|Community 108]]
- [[_COMMUNITY_Community 109|Community 109]]
- [[_COMMUNITY_Community 110|Community 110]]
- [[_COMMUNITY_Community 111|Community 111]]
- [[_COMMUNITY_Community 112|Community 112]]
- [[_COMMUNITY_Community 113|Community 113]]
- [[_COMMUNITY_Community 114|Community 114]]
- [[_COMMUNITY_Community 115|Community 115]]
- [[_COMMUNITY_Community 116|Community 116]]
- [[_COMMUNITY_Community 117|Community 117]]
- [[_COMMUNITY_Community 118|Community 118]]
- [[_COMMUNITY_Community 120|Community 120]]
- [[_COMMUNITY_Community 121|Community 121]]
- [[_COMMUNITY_Community 122|Community 122]]
- [[_COMMUNITY_Community 123|Community 123]]
- [[_COMMUNITY_Community 124|Community 124]]
- [[_COMMUNITY_Community 125|Community 125]]

## God Nodes (most connected - your core abstractions)
1. `Prisma Game model (incl. gameSleeves, bggId, status)` - 8 edges
2. `push()` - 7 edges
3. `CollectionPage` - 6 edges
4. `Sleeve (Prisma model)` - 6 edges
5. `Game table` - 6 edges
6. `PUT()` - 5 edges
7. `DELETE()` - 5 edges
8. `POST()` - 5 edges
9. `getBggGame()` - 5 edges
10. `GET/PUT/DELETE /api/games/[id] (CRUD with sleeve assoc & BGG sync)` - 5 edges

## Surprising Connections (you probably didn't know these)
- `POST()` --calls--> `getBggGame()`  [INFERRED]
  app/api/bgg/enrich/route.ts → lib/bgg.ts
- `POST /api/games/import-bgg (login to BGG, fetch collection XML, import)` --calls--> `BoardGameGeek external API (xmlapi2 + login + geekplays/geekcollection)`  [EXTRACTED]
  bgapp/app/api/games/import-bgg/route.ts → external://boardgamegeek.com
- `POST /api/games/push-bgg (push game to BGG collection as owned)` --calls--> `BoardGameGeek external API (xmlapi2 + login + geekplays/geekcollection)`  [EXTRACTED]
  bgapp/app/api/games/push-bgg/route.ts → external://boardgamegeek.com
- `POST /api/plays/import (BGG plays import with paged XML)` --calls--> `BoardGameGeek external API (xmlapi2 + login + geekplays/geekcollection)`  [EXTRACTED]
  bgapp/app/api/plays/import/route.ts → external://boardgamegeek.com
- `POST /api/plays/push (push single play to BGG)` --calls--> `BoardGameGeek external API (xmlapi2 + login + geekplays/geekcollection)`  [EXTRACTED]
  bgapp/app/api/plays/push/route.ts → external://boardgamegeek.com

## Hyperedges (group relationships)
- **Shared BGG login + cookie usage flow across BGG-touching routes** — games_import_bgg_route_post, games_push_bgg_route_post, plays_import_route_post, plays_push_route_post, bgg_external_api [EXTRACTED 1.00]
- **Game status changes propagate to BGG via syncBggStatus + statusToBggFlags** — games_route, games_id_route, lib_bgg_module, settings_route, bgg_external_api [EXTRACTED 1.00]
- **BGG enrichment populates Game and WishlistGame metadata** — bgg_enrich_route_post, lib_bgg_module, prisma_game_model, prisma_wishlist_game_model [EXTRACTED 1.00]
- **Collection UI surface** —  [INFERRED 0.90]
- **Wishlist REST API** —  [EXTRACTED 1.00]
- **Generated Prisma client surface** —  [EXTRACTED 1.00]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.11
Nodes (27): POST /api/auth/login (sets bgm_auth cookie via SHA-256 of APP_PASSWORD), POST /api/auth/logout (clears bgm_auth cookie), POST /api/bgg/enrich (batch enrich games & wishlist from BGG), BoardGameGeek external API (xmlapi2 + login + geekplays/geekcollection), Inline bggLogin helper duplicated across import/push routes, POST /api/games/ensure-guest (find or create GiocatoEsterno game), GET /api/games/export (CSV export of collection), GET/PUT/DELETE /api/games/[id] (CRUD with sleeve assoc & BGG sync) (+19 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (19): POST /api/bgg/enrich, GameDetailPage, CollectionLoading, NewGamePage, CollectionPage, CollectionTable, EnrichButton, GameCard (+11 more)

### Community 2 - "Community 2"
Cohesion: 0.18
Nodes (15): migration add description+designers, Game table, GameSleeve join table, migration init 20260427124150, migration add mechanics, migration add sleeve registry, Sleeve table, WishlistGame table (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.21
Nodes (9): GET(), POST(), POST(), decodeXmlEntities(), getBggGame(), getBggSession(), searchBgg(), statusToBggFlags() (+1 more)

### Community 4 - "Community 4"
Cohesion: 0.23
Nodes (11): bggLogin(), decodeHtml(), fixUrl(), parseCollectionXml(), POST(), subtypeToType(), bggLogin(), decodeHtml() (+3 more)

### Community 5 - "Community 5"
Cohesion: 0.18
Nodes (12): BoardGameGeekAPI, BggLib, BggSearch, CollectionImporter, GameForm, BggImportFeature, PlaysImporter, SleeveEditor (+4 more)

### Community 6 - "Community 6"
Cohesion: 0.29
Nodes (11): GameSleeve (Prisma model), SleevesLayout, SleevesLoading, addSleeve (server action), deleteSleeve (server action), EditSleevePage, NewSleevePage, SleevesPage (+3 more)

### Community 7 - "Community 7"
Cohesion: 0.33
Nodes (7): buildParams(), goPage(), onLimit(), onSort(), onStatus(), onType(), push()

### Community 8 - "Community 8"
Cohesion: 0.22
Nodes (2): applyBggData(), refreshFromBgg()

### Community 9 - "Community 9"
Cohesion: 0.22
Nodes (2): close(), todayStr()

### Community 10 - "Community 10"
Cohesion: 0.25
Nodes (9): lib/prisma client singleton, Sleeve (Prisma model), Prisma server client, createPrismaClient, Prisma internal class, Prisma namespace, PrismaNeonHttp adapter, GET /api/sleeves/all (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.46
Nodes (3): DELETE(), GET(), PUT()

### Community 13 - "Community 13"
Cohesion: 0.25
Nodes (8): PUT /api/settings, PlaysLoading, PlaysPage, SettingsPage, Play (Prisma model), Settings (Prisma model), SettingsForm.handleSubmit, SettingsForm

### Community 14 - "Community 14"
Cohesion: 0.7
Nodes (4): buildCostByYear(), countField(), GET(), round2()

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (2): runImport(), startClick()

### Community 17 - "Community 17"
Cohesion: 0.5
Nodes (2): runImport(), startClick()

### Community 18 - "Community 18"
Cohesion: 0.5
Nodes (2): buildSleeveData(), toInt()

### Community 22 - "Community 22"
Cohesion: 0.5
Nodes (4): HomeLoading, Loan (Prisma model), Home (page), WishlistGame (Prisma model)

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (4): Charts, HBarChart, statusColor, YearBarChart

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (2): proxy(), tokenFor()

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (2): POST(), tokenFor()

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (2): bggLogin(), POST()

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (2): bggLogin(), POST()

### Community 38 - "Community 38"
Cohesion: 0.67
Nodes (3): Prisma browser entry, Prisma enums, Prisma namespace browser

### Community 39 - "Community 39"
Cohesion: 0.67
Nodes (3): POST /api/auth/login, LoginPage.handleSubmit, LoginPage

### Community 40 - "Community 40"
Cohesion: 0.67
Nodes (3): StatCards, StatisticsFeature, StatisticsPage

### Community 41 - "Community 41"
Cohesion: 0.67
Nodes (3): Skeleton, StatisticsLoading, WishlistLoading

### Community 42 - "Community 42"
Cohesion: 0.67
Nodes (3): EditPlayModal, LogPlayModal, PlaysFeature

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (3): Navigation, NavigationGuard, RandomPicker

### Community 44 - "Community 44"
Cohesion: 0.67
Nodes (3): GameStatus type, STATUS_COLORS map, STATUS_LABELS map

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (2): Next.js agent rules: read node_modules docs before coding, CLAUDE.md includes AGENTS.md

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (2): layout metadata, RootLayout

### Community 70 - "Community 70"
Cohesion: 2.0
Nodes (2): LoanManager, Toast

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (2): proxy auth middleware, tokenFor function

### Community 107 - "Community 107"
Cohesion: 1.0
Nodes (1): README: Next.js create-next-app project

### Community 108 - "Community 108"
Cohesion: 1.0
Nodes (1): lib/prisma Prisma singleton client

### Community 109 - "Community 109"
Cohesion: 1.0
Nodes (1): AppleIcon

### Community 110 - "Community 110"
Cohesion: 1.0
Nodes (1): manifest

### Community 111 - "Community 111"
Cohesion: 1.0
Nodes (1): ESLintConfig

### Community 112 - "Community 112"
Cohesion: 1.0
Nodes (1): GameType type

### Community 113 - "Community 113"
Cohesion: 1.0
Nodes (1): InsertStatus type

### Community 114 - "Community 114"
Cohesion: 1.0
Nodes (1): SleevesStatus type

### Community 115 - "Community 115"
Cohesion: 1.0
Nodes (1): SleeveEntry interface

### Community 116 - "Community 116"
Cohesion: 1.0
Nodes (1): SLEEVE_SIZES constant

### Community 117 - "Community 117"
Cohesion: 1.0
Nodes (1): next.config

### Community 118 - "Community 118"
Cohesion: 1.0
Nodes (1): postcss config (tailwindcss)

### Community 120 - "Community 120"
Cohesion: 1.0
Nodes (1): BGManager App Icon (4-dot die motif)

### Community 121 - "Community 121"
Cohesion: 1.0
Nodes (1): File Icon SVG

### Community 122 - "Community 122"
Cohesion: 1.0
Nodes (1): Vercel Logo SVG

### Community 123 - "Community 123"
Cohesion: 1.0
Nodes (1): Next.js Logo SVG

### Community 124 - "Community 124"
Cohesion: 1.0
Nodes (1): Globe Icon SVG

### Community 125 - "Community 125"
Cohesion: 1.0
Nodes (1): Window Icon SVG

## Ambiguous Edges - Review These
- `Navigation` → `RandomPicker`  [AMBIGUOUS]
  bgapp/components/RandomPicker.tsx · relation: navigates_via

## Knowledge Gaps
- **70 isolated node(s):** `Next.js agent rules: read node_modules docs before coding`, `CLAUDE.md includes AGENTS.md`, `README: Next.js create-next-app project`, `POST /api/auth/logout (clears bgm_auth cookie)`, `GET /api/games/export (CSV export of collection)` (+65 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 8`** (10 nodes): `applyBggData()`, `clearBgg()`, `extractSleevesFromInitial()`, `handleDelete()`, `handleSubmit()`, `Label()`, `parseDesigners()`, `refreshFromBgg()`, `toDateInput()`, `GameForm.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 9`** (10 nodes): `addPlayer()`, `close()`, `handleSubmit()`, `Label()`, `pickBggGame()`, `removePlayer()`, `searchBgg()`, `todayStr()`, `LogPlayModal.tsx`, `updatePlayer()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 15`** (5 nodes): `close()`, `doImport()`, `runImport()`, `startClick()`, `CollectionImporter.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 17`** (5 nodes): `close()`, `doImport()`, `runImport()`, `startClick()`, `PlaysImporter.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 18`** (5 nodes): `buildSleeveData()`, `import-excel.mjs`, `toFloat()`, `toInt()`, `toISODate()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 24`** (3 nodes): `proxy()`, `tokenFor()`, `proxy.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (3 nodes): `route.ts`, `POST()`, `tokenFor()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (3 nodes): `route.ts`, `bggLogin()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (3 nodes): `route.ts`, `bggLogin()`, `POST()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (2 nodes): `Next.js agent rules: read node_modules docs before coding`, `CLAUDE.md includes AGENTS.md`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (2 nodes): `layout metadata`, `RootLayout`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (2 nodes): `LoanManager`, `Toast`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (2 nodes): `proxy auth middleware`, `tokenFor function`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 107`** (1 nodes): `README: Next.js create-next-app project`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 108`** (1 nodes): `lib/prisma Prisma singleton client`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 109`** (1 nodes): `AppleIcon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 110`** (1 nodes): `manifest`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 111`** (1 nodes): `ESLintConfig`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 112`** (1 nodes): `GameType type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 113`** (1 nodes): `InsertStatus type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 114`** (1 nodes): `SleevesStatus type`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 115`** (1 nodes): `SleeveEntry interface`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 116`** (1 nodes): `SLEEVE_SIZES constant`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 117`** (1 nodes): `next.config`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 118`** (1 nodes): `postcss config (tailwindcss)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 120`** (1 nodes): `BGManager App Icon (4-dot die motif)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 121`** (1 nodes): `File Icon SVG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 122`** (1 nodes): `Vercel Logo SVG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 123`** (1 nodes): `Next.js Logo SVG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 124`** (1 nodes): `Globe Icon SVG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 125`** (1 nodes): `Window Icon SVG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Navigation` and `RandomPicker`?**
  _Edge tagged AMBIGUOUS (relation: navigates_via) - confidence is low._
- **Why does `lib/bgg helper module (searchBgg, getBggGame, syncBggStatus, statusToBggFlags)` connect `Community 0` to `Community 3`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `GET()` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `CollectionPage` (e.g. with `CollectionLoading` and `NewGamePage`) actually correct?**
  _`CollectionPage` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Next.js agent rules: read node_modules docs before coding`, `CLAUDE.md includes AGENTS.md`, `README: Next.js create-next-app project` to the rest of the system?**
  _70 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.11 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._