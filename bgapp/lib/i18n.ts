/**
 * i18n minimale, senza framework (il fork di Next e il proxy sconsigliano
 * next-intl). Un dizionario puro chiave → {it, en}, usabile sia nei componenti
 * server sia in quelli client. La lingua vive in un cookie `bgm_lang`; il
 * default viene dall'Accept-Language del browser (vedi lib/i18nServer).
 *
 * Aggiungere una stringa = una voce qui + `t("chiave")` al posto del testo.
 * Ambito: solo l'area sondaggi (vedi DICT).
 */
export type Lang = "it" | "en";
export const LANGS: Lang[] = ["it", "en"];
export const LANG_COOKIE = "bgm_lang";

type Entry = { it: string; en: string };

// Dizionario. L'inglese copre SOLO l'area sondaggi (/survey), che è dove
// entrano gli ospiti come Mike; l'app admin resta volutamente in italiano.
export const DICT: Record<string, Entry> = {
  // ── Comuni ──
  "common.cancel":   { it: "Annulla", en: "Cancel" },
  "common.create":   { it: "Crea", en: "Create" },
  "common.close":    { it: "Chiudi", en: "Close" },
  "common.who":      { it: "Dì prima chi sei.", en: "Say who you are first." },

  // ── Area sondaggi ──
  "s.title":         { it: "Cosa giochiamo?", en: "What do we play?" },
  "s.subtitle":      { it: "Sondaggi di gruppo", en: "Group polls" },
  "s.login":         { it: "Entra", en: "Enter" },
  "s.wrongPw":       { it: "Password errata", en: "Wrong password" },
  "s.password":      { it: "Password", en: "Password" },
  "s.back":          { it: "Sondaggi", en: "Polls" },
  "s.newPoll":       { it: "Nuovo sondaggio", en: "New poll" },
  "s.pollTitle":     { it: "Titolo (es. Giovedì sera)", en: "Title (e.g. Thursday night)" },
  "s.whenPlay":      { it: "Quando si gioca", en: "When we play" },
  "s.multi":         { it: "Scelte multiple", en: "Multiple choices" },
  "s.max":           { it: "Massimo", en: "At most" },
  "s.games":         { it: "giochi", en: "games" },
  "s.noLimit":       { it: "(vuoto = senza limite)", en: "(empty = no limit)" },
  "s.winners":       { it: "Giochi vincitori", en: "Winning games" },
  "s.winnersHint":   { it: "(i tavoli a fine sondaggio)", en: "(the tables at the end)" },
  "s.proposersVote": { it: "Chi propone può votare il proprio gioco", en: "Proposers can vote their own game" },
  "s.secret":        { it: "Voto segreto", en: "Secret vote" },
  "s.secretHint":    { it: "(risultati solo alla chiusura)", en: "(results only at close)" },
  "s.autoClose":     { it: "Chiusura automatica (opzionale)", en: "Automatic closing (optional)" },
  "s.closeAtVoters": { it: "quando votano in", en: "when this many have voted" },
  "s.closeAtDate":   { it: "oppure il", en: "or on" },
  "s.created":       { it: "Sondaggio creato", en: "Poll created" },
  "s.noPolls":       { it: "Ancora nessun sondaggio. Creane uno.", en: "No polls yet. Create one." },
  "s.of":            { it: "di", en: "by" },
  "s.gamesCount":    { it: "giochi", en: "games" },
  "s.whoAreYou":     { it: "Chi sei?", en: "Who are you?" },
  "s.playingAs":     { it: "Stai giocando come", en: "You're playing as" },
  "s.change":        { it: "Cambia", en: "Change" },
  "s.newName":       { it: "Nuovo nome", en: "New name" },
  "s.yourName":      { it: "Il tuo nome", en: "Your name" },
  "s.proposeGame":   { it: "Proponi un gioco", en: "Propose a game" },
  "s.searchBgg":     { it: "Cerca su BoardGameGeek…", en: "Search on BoardGameGeek…" },
  "s.searching":     { it: "cerco su BGG…", en: "searching BGG…" },
  "s.minTwo":        { it: "Scrivi almeno due lettere.", en: "Type at least two letters." },
  "s.noGame":        { it: "Nessun gioco su BGG.", en: "No game on BGG." },
  "s.adding":        { it: "aggiungo…", en: "adding…" },
  "s.noProposed":    { it: "Nessun gioco proposto.", en: "No game proposed." },
  "s.addOne":        { it: "Aggiungine uno.", en: "Add one." },
  "s.proposes":      { it: "propone", en: "proposed by" },
  "s.itsYours":      { it: "è tuo", en: "it's yours" },
  "s.votes":         { it: "voti", en: "votes" },
  "s.rating":        { it: "gradimento:", en: "rating:" },
  "s.oneChoice":     { it: "Una sola scelta", en: "Single choice" },
  "s.multiChoice":   { it: "Scelte multiple", en: "Multiple choices" },
  "s.canVoteOwn":    { it: "puoi votare i tuoi giochi", en: "you can vote your games" },
  "s.cantVoteOwn":   { it: "non voti i tuoi giochi", en: "you don't vote your games" },
  "s.secretBadge":   { it: "voto segreto", en: "secret vote" },
  "s.closesAtN":     { it: "chiude a {n} votanti", en: "closes at {n} voters" },
  "s.closesOn":      { it: "chiude {d}", en: "closes {d}" },
  "s.winnersBadge":  { it: "vincitori", en: "winners" },
  "s.secretHidden":  { it: "Voto segreto: i risultati appaiono alla chiusura.", en: "Secret vote: results appear at close." },
  "s.ranking":       { it: "Classifica", en: "Standings" },
  "s.finalResult":   { it: "Risultato finale", en: "Final result" },
  "s.pollClosed":    { it: "sondaggio chiuso", en: "poll closed" },
  "s.game":          { it: "Gioco", en: "Game" },
  "s.winnersLabel":  { it: "Vincitori:", en: "Winners:" },
  "s.copyWa":        { it: "Copia per WhatsApp", en: "Copy for WhatsApp" },
  "s.copied":        { it: "Copiato! Incolla su WhatsApp", en: "Copied! Paste into WhatsApp" },
  "s.copyFail":      { it: "Copia non riuscita", en: "Copy failed" },
  "s.tablesAtClose": { it: "I tavoli si propongono alla chiusura del sondaggio.", en: "Tables are proposed when the poll closes." },
  "s.proposeTables": { it: "Proponi i tavoli", en: "Propose the tables" },
  "s.noValidTable":  { it: "Nessun tavolo: nessun gioco vincitore ha preso voti.", en: "No table: no winning game got votes." },
  "s.players":       { it: "giocatori", en: "players" },
  "s.belowMin":      { it: "sotto il minimo di giocatori", en: "below the minimum players" },
  "s.noTable":       { it: "Senza tavolo:", en: "No table:" },
  "s.tablesNote":    { it: "Proposta automatica dai voti e dal gradimento — sistemala a mano come serve.", en: "Automatic proposal from votes and ratings — adjust it by hand as needed." },
  "s.closePoll":     { it: "Chiudi sondaggio", en: "Close poll" },
  "s.reopen":        { it: "Riapri", en: "Reopen" },
  "s.deletePoll":    { it: "Elimina sondaggio", en: "Delete poll" },
  "s.notFound":      { it: "Sondaggio non trovato.", en: "Poll not found." },
  "s.voteN":         { it: "Vota ({n})", en: "Vote ({n})" },
  "s.cancelMyVote":  { it: "Annulla il mio voto", en: "Cancel my vote" },
  "s.voteDone":      { it: "Voto registrato", en: "Vote recorded" },
  "s.voteCancelled": { it: "Voto annullato", en: "Vote cancelled" },
  "s.voteFail":      { it: "Voto non riuscito", en: "Vote failed" },
  "s.openBgg":       { it: "Apri su BoardGameGeek", en: "Open on BoardGameGeek" },
  "s.removeGame":    { it: "Togli gioco", en: "Remove game" },
  "s.gameRemoved":   { it: "Gioco tolto", en: "Game removed" },
  "s.notDone":       { it: "Non riuscito", en: "Didn't work" },
  "s.maxChoices":    { it: "Massimo {n} scelte.", en: "At most {n} choices." },
  "s.proposedToast": { it: "\"{g}\" proposto", en: "\"{g}\" proposed" },
  "s.closedToast":   { it: "Sondaggio chiuso", en: "Poll closed" },
  "s.reopenedToast": { it: "Sondaggio riaperto", en: "Poll reopened" },
  "s.deletedToast":  { it: "Sondaggio eliminato", en: "Poll deleted" },
  "s.confirmRemoveGame": { it: "Togliere \"{g}\" dalle proposte? Spariscono anche i suoi voti.", en: "Remove \"{g}\" from the proposals? Its votes go too." },
  "s.confirmDeletePoll": { it: "Eliminare il sondaggio? Spariscono proposte e voti.", en: "Delete the poll? Proposals and votes go too." },
  "s.msgRanking":    { it: "Classifica:", en: "Standings:" },
  "s.msgTables":     { it: "Tavoli:", en: "Tables:" },
  "s.msgNoTable":    { it: "Senza tavolo:", en: "No table:" },
};

/** Traduci una chiave nella lingua data, con interpolazione di {segnaposto}. */
export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const entry = DICT[key];
  let s = entry ? (entry[lang] ?? entry.it) : key;
  if (vars) for (const k of Object.keys(vars)) s = s.replaceAll(`{${k}}`, String(vars[k]));
  return s;
}

/** Normalizza una stringa di lingua (es. "en-US") in una lingua supportata. */
export function normalizeLang(raw: string | null | undefined): Lang {
  return raw && raw.toLowerCase().startsWith("en") ? "en" : "it";
}
