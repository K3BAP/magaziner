# Aufgaben 3.0 – Gamification-Plan

Stand: 2026-11-26 · Basis: `master` @ 9676f6f (Release 2.2.0) · Status: **freigegeben, M1 umgesetzt (2.3.0, noch nicht committet)**

Ziel: Aus der einfachen To-do-Liste wird ein Haushalts-Spiel, das zum Mitmachen motiviert:
XP und Level pro Person, ein gemeinsames Wochenziel, Quests, Abzeichen, eine Team-Energie,
Münzen für selbst festgelegte Belohnungen und Rotation bei wiederkehrenden Aufgaben.
„Aufgaben“ ersetzt in der Tab-Leiste die „Vorräte“, die ins Mehr-Menü wandern.

Ausgangslage: In der Produktion gibt es einen Haushalt mit zwei Personen, 4 To-dos und keine
wiederkehrenden Aufgaben. Das Konzept ist auf 2 Personen ausgelegt, funktioniert aber mit
beliebig vielen Mitgliedern (und auch allein: dann ohne Fairness-Balken und Kudos).

---

## 1. Abgestimmte Entscheidungen

| Thema | Entscheidung |
|---|---|
| Spielmodus | **Team + Level**: persönliche XP und Level, gemeinsames Wochenziel, Fairness-Balken statt Sieger |
| Wiederkehr | **Frische-Balken**: Intervall ab der letzten Erledigung statt fester Termine. Einmalige Aufgaben bleiben. |
| Punkte | **XP** (Level, nie verlierbar) + **Münzen** (Währung für den Shop) |
| Verlässlichkeit | Streaks mit Joker, Rettungs-Bonus, Pünktlich-Bonus, **Team-Energie** als Strafe |
| Zuteilung | Fest · Abwechselnd · Fair-Modus · Offen (pro Aufgabe) |
| XP-Bemessung | Aufwand-Stufen Mini 5 / Klein 10 / Mittel 20 / Groß 40 |
| Quests | Wochenziel (Team), 3 Wochen-Quests, Abzeichen, Räume mit Zustand |
| Tab | „Aufgaben“ (ersetzt „Vorräte“) |
| Push | Morgen-Übersicht, Erledigt-Meldung, Belohnung eingelöst, Energie-Warnung, pro Gerät schaltbar |
| Belohnungen | Gutschein-Ablauf: Einlösen kostet Münzen, die andere Person hakt den Gutschein ab, wenn er erfüllt ist |
| Extras | Urlaubsmodus, Starter-Vorlagen, Kudos, Wochenrückblick |

### Inspiration (nur Mechaniken)
- **Frische-Balken statt Termin**: kennt man aus Putzplan-Apps, die pro Aufgabe einen Zustand anzeigen,
  der mit der Zeit „verschmutzt“. Das nimmt den Termindruck raus und zeigt trotzdem, was ansteht.
- **Räume mit Sauberkeits-Prozent + Aufwand-Punkte**: wie bei raumbasierten Cleaning-Apps mit Haushalts-Rangliste.
  Wir übernehmen Räume und Punkte, ersetzen die Rangliste aber durch Team-Ziel und Fairness-Anzeige.
- **Rotation / fairer Putzplan**: wie bei WG-Putzplan-Apps.
- **Selbst definierte Belohnungen, Level, Team-„Boss“**: aus Habit-Rollenspiel-Apps. Unsere Team-Energie
  ist die freundliche Variante der dortigen Lebenspunkte.

Eigene Figur, eigene Namen, eigene Optik; es wird nichts von diesen Apps nachgebaut.

---

## 2. Spielregeln

### 2.1 Aufgaben
Es gibt zwei Arten:
- **Wiederkehrend** mit Intervall in Tagen (Presets: täglich, alle 2/3 Tage, wöchentlich, alle 2 Wochen,
  monatlich = 30, vierteljährlich = 90, eigener Wert).
- **Einmalig** mit optionalem Fälligkeitsdatum. Das entspricht dem bisherigen To-do und wird nach dem Erledigen archiviert.

Felder: Titel, Raum (optional), Aufwand, „unbeliebt“, Zuteilungs-Modus, Notiz.

### 2.2 Frische
Für wiederkehrende Aufgaben gilt `elapsed = heute − zuletzt erledigt` und `ratio = elapsed / intervall`.

| Zustand | Bedingung | Farbe |
|---|---|---|
| Frisch | ratio < 0,7 | grün (`success`) |
| Bald fällig | 0,7 ≤ ratio < 1 | gelb (`warning`) |
| Fällig | 1 ≤ ratio < 1,5 bzw. bis 2 Tage drüber | orange |
| Überfällig | ratio ≥ 1,5 **und** mindestens 2 Tage drüber | rot (`error`), kostet Team-Energie |

Gespeichert wird `next_due` (Datum). Daraus ergibt sich die Frische als
`(next_due − intervall … next_due)`. Damit lassen sich Urlaubspausen durch Verschieben von `next_due`
umsetzen. Neue Aufgaben fragen „Wann zuletzt gemacht?“ (heute / vor X Tagen / noch nie = sofort fällig),
damit nicht alles gleichzeitig grün startet.

Einmalige Aufgaben haben keinen Balken. Ihr Zustand ergibt sich aus dem Fälligkeitsdatum, und ohne Datum gibt es keinen Energie-Abzug.

### 2.3 XP und Münzen pro Erledigung

```
basis      = Mini 5 | Klein 10 | Mittel 20 | Groß 40
× 1,5      wenn „unbeliebt“
× 1,25     Pünktlich-Bonus: erledigt, bevor es „Fällig“ wird (0,5 ≤ ratio < 1) bzw. bis zum Fälligkeitstag
× 1,5      Rettungs-Bonus: Zustand „Überfällig“ und die erledigende Person war NICHT zugeteilt
× 0,5      Zu früh: ratio < 0,5 (verhindert XP-Farmen durch tägliches Badputzen)
XP         = round(basis × Faktoren)
Münzen     = round(XP / 5) × Energie-Faktor (siehe 2.5)
```
Pünktlich und Rettung schließen sich aus. Einmalige Aufgaben bekommen Pünktlich, wenn sie vor oder am
Fälligkeitstag erledigt werden, und Rettung wie oben. Die Werte sind Startwerte und liegen zentral in
`private.game_config()` bzw. `src/utils/game.ts`, damit sie sich leicht nachjustieren lassen.

### 2.4 Level
XP von Level L zu L+1: `100 + 50 × (L − 1)`. Level 2 gibt es bei 100 XP, Level 3 bei 250, Level 5 bei 700,
Level 10 bei 2.700 und Level 20 bei 10.400. Bei ca. 250 XP pro Woche und Person erreicht man Level 5
nach etwa 3 Wochen und Level 10 nach etwa 11 Wochen.

Titel (geschlechtsneutral): 1–4 *Neuling* · 5–9 *Ordnungsfan* · 10–14 *Putzprofi* ·
15–19 *Haushalts-Ass* · 20–29 *Glanzleistung* · 30+ *Legende*. Ein Level-Up löst eine Feier-Sheet mit
Konfetti aus und zählt +10 Münzen.

### 2.5 Team-Energie (die Strafe)
Der Haushalt hat einen Energie-Wert von 0 bis 100 (Start: 80), dargestellt als Balken neben einem
kleinen Hausgeist (Emoji-Stimmung 😄 🙂 😐 😩).
- **Abzug** (täglich um 03:00 Uhr): pro überfälliger Aufgabe 1/2/3/4 Energie (je nach Aufwand), höchstens −15 pro Tag.
- **Auffüllen**: Jede Erledigung bringt +1/2/3/4 Energie, eine Rettung das Doppelte. Maximum 100.
- **Wirkung** auf Münzen für alle: ≥ 80 *Hochform* × 1,2 · 30–79 × 1,0 · < 30 *Erschöpft* × 0,5.
  Bei **0** gilt das Wochenziel dieser Woche als gescheitert (Quests laufen weiter).
- XP werden nie abgezogen, Level sinken also nicht. Die Strafe trifft das Team, nicht eine einzelne Person.

### 2.6 Streaks
Pro Person zählt der Streak die Tage in Folge mit mindestens einer Erledigung.
- **Joker**: einer pro Woche (Montag neu, nicht ansparbar). Ein verpasster Tag verbraucht automatisch den Joker, statt den Streak zu beenden.
- Meilensteine: 7 Tage +10 Münzen, 30 Tage +50, 100 Tage +150, jeweils mit Abzeichen.
- Im Urlaubsmodus friert der Streak ein.

### 2.7 Zuteilung und Rotation
| Modus | Wer ist dran | Nach dem Erledigen |
|---|---|---|
| Fest | eine Person | bleibt |
| Abwechselnd | Reihenfolge der ausgewählten Mitglieder | **die Person nach dem Erlediger** (übernimmt B für A, ist danach wieder A dran) |
| Fair | aus den ausgewählten Mitgliedern | wer **diese Woche die wenigsten XP** hat, bei Gleichstand wer die Aufgabe am längsten nicht gemacht hat |
| Offen | niemand | niemand, wer zuerst kommt, bekommt die XP |

- Wer im Urlaub ist, wird bei Abwechselnd und Fair übersprungen.
- **Abgeben**: In der Aufgabe kann man „Diesmal an … abgeben“ wählen. Das ändert nur `current_assignee`, die Reihenfolge bleibt.
- „Für mich“-Filter: zeigt Aufgaben, die mir zugeteilt sind, und offene Aufgaben.

### 2.8 Wochenziel (Team)
Eine Woche geht von Montag bis Sonntag (Europe/Berlin).
- Ziel = 80 % der erwarteten XP aller wiederkehrenden Aufgaben (Σ `7 / intervall × basis-XP`),
  auf 10 gerundet, mindestens 50.
- Erreicht: +20 Münzen für alle Mitglieder, die in der Woche etwas erledigt haben, und die
  Wochenziel-Serie steigt um eins.
- Unter dem Ziel zeigt ein **Fairness-Balken** den Anteil jeder Person (Farbe = Avatar-Ring), ohne Wertung.

### 2.9 Wochen-Quests
Jeden Montag werden 3 Team-Quests aus einem Katalog gezogen (keine Wiederholung aus der Vorwoche,
nur passende: „Raum“-Quests nur, wenn es Räume gibt). Belohnung je 10–25 Münzen für alle.
Der Fortschritt wird immer aus `chore_completions` der Woche **berechnet** und nicht hochgezählt,
deshalb macht ein Rückgängig nichts kaputt.

Startkatalog:
| Key | Text | Ziel |
|---|---|---|
| `rescue` | Rettungsdienst: Rettet {n} überfällige Aufgaben | n = 2–3 |
| `early_bird` | Frühaufsteher: {n} Aufgaben vor 9 Uhr | n = 4 |
| `big_cleanup` | Großputz: {n} große Aufgaben | n = 2 |
| `unloved` | Ungeliebtes zuerst: {n} unbeliebte Aufgaben | n = 3 |
| `everyone` | Teamwork: Jede Person erledigt mindestens {n} | n = 4 |
| `room_shine` | {Raum} auf Hochglanz: alle Aufgaben im Raum gleichzeitig grün | – |
| `no_red` | Alles im Griff: Sonntagabend nichts überfällig | Auswertung beim Wochenwechsel |
| `swap` | Tauschbörse: {n}× eine Aufgabe übernehmen, die nicht deine war | n = 3 |
| `kudos` | Danke sagen: {n} Kudos verteilen | n = 5 |
| `streak_team` | Gemeinsam dran: An 5 Tagen hat jede Person etwas erledigt | – |

### 2.10 Abzeichen
Sie werden serverseitig beim Erledigen bzw. beim Wochenwechsel vergeben und bleiben dauerhaft.
Startset: *Erste Aufgabe*, *50 / 250 / 1000 Aufgaben*, *Streak 7 / 30 / 100*, *Retter in der Not*
(10 Rettungen), *Frühaufsteher* (20 vor 9 Uhr), *Nachteule* (20 nach 22 Uhr), *Ungeliebtes-Held*
(25 unbeliebte), *Teamplayer* (4 Wochenziele in Folge), *Questmeister* (25 Quests), *Großzügig*
(50 Kudos verteilt), *Allrounder* (in jedem Raum mindestens 10).

### 2.11 Räume
Räume gehören zum Haushalt (Name + Emoji + Sortierung). Der Zustand eines Raums ist der Mittelwert der Frische
seiner wiederkehrenden Aufgaben (100 % bei ratio 0, 0 % ab Überfällig). Es gibt eine Raum-Übersicht als
Kachelraster mit Ring, und ein Tipp auf eine Kachel öffnet die Aufgaben des Raums.

### 2.12 Belohnungs-Shop
- Jedes Mitglied kann Belohnungen anlegen (Emoji, Titel, Preis in Münzen). Preisvorschläge: klein 30,
  mittel 80, groß 200 (bei ca. 50–70 Münzen pro Person und Woche).
- **Einlösen** (RPC): prüft das Guthaben, zieht die Münzen ab, legt einen **Gutschein** an und schickt einen Push an die anderen.
- Jede andere Person kann den Gutschein mit „Erfüllt“ abhaken. Die einlösende Person kann ihn
  innerhalb von 24 h stornieren und bekommt die Münzen zurück.
- Mitgelieferte Beispiele zum Übernehmen: Film aussuchen · Frühstück ans Bett · Einmal Spülen geschenkt ·
  Ausschlafen am Wochenende · Lieblingsessen wird gekocht · Massage (10 min).

### 2.13 Kudos
Ein Emoji (👏 💪 ✨ ❤️) auf die Erledigung einer anderen Person, sichtbar in der Aktivität und an der Aufgabe.
Pro Erledigung und gebender Person gibt es eine Kudos, und die empfangende Person bekommt +1 Münze.
Sich selbst Kudos geben geht nicht.

### 2.14 Urlaubsmodus
- **Person** („Ich bin weg bis …“): Die Person fällt aus Rotation und Fair-Modus raus, ihr Streak friert ein, und sie bekommt keine Morgen-Übersicht.
- **Haushalt** („Alle weg bis …“): kein Energie-Abzug, Streaks frieren ein, und die Wochen dieser Zeit werden nicht gewertet.
  Beim Ende verschiebt sich `next_due` aller wiederkehrenden Aufgaben um die Pausentage, sodass die Balken dort weiterlaufen, wo sie standen.

### 2.15 Wochenrückblick
Der Wochenwechsel (Montag 03:00) schreibt eine Zeile in `game_weeks`. Beim ersten Öffnen in der neuen Woche
zeigt die App eine Rückblick-Sheet: Ziel erreicht? Team-XP, Anteil pro Person, erledigte Quests, neue
Abzeichen, das Highlight (z. B. „Größte Rettung“), dazu die neuen Quests. Ob die Karte gesehen wurde, steht in
`game_member_state.recap_seen_week` und gilt damit geräteübergreifend.

### 2.16 Rückgängig und Gleichzeitigkeit
- Nach dem Erledigen erscheint ein Toast mit „Rückgängig“ (Konvention). Die RPC `undo_chore_completion` erlaubt das der
  erledigenden Person innerhalb von 24 h. Sie stellt `next_due` und `current_assignee` wieder her (beides steht
  in der Completion-Zeile) und entfernt die Ledger-Buchungen. Abzeichen bleiben erhalten.
- `complete_chore` sperrt die Aufgabe (`FOR UPDATE`). Wurde sie in den letzten 10 Minuten schon
  erledigt, kommt `already_done` mit Name zurück, und der Client zeigt „Hat Anna gerade erledigt“.

---

## 3. Datenmodell

Alle Tabellen haben `household_id` und RLS über `private.is_active_household(household_id)`.
**Spielwerte (Ledger, Completions, Abzeichen, Spielstand) schreibt nur der Server** über
`SECURITY DEFINER`-RPCs. Für `authenticated` gibt es dort nur Select-Policies. `chores`, `chore_areas`
und `rewards` sind normal per RLS beschreibbar.

```sql
chore_areas      (id, household_id, name, emoji, sort, created_at)

chores           (id, household_id, title, notes,
                  area_id → chore_areas ON DELETE SET NULL,
                  kind text check in ('recurring','once'),
                  interval_days int null,           -- recurring
                  due_date date null,               -- once (optional)
                  next_due date null,               -- recurring: nächste Fälligkeit
                  effort text check in ('mini','small','medium','large') default 'small',
                  unpopular bool default false,
                  assign_mode text check in ('fixed','rotate','fair','open') default 'open',
                  rotation uuid[] default '{}',     -- Mitglieder-Reihenfolge (rotate/fair)
                  current_assignee uuid null → auth.users,
                  last_done_at timestamptz, last_done_by uuid,
                  completed_at timestamptz null,    -- once: erledigt
                  created_by uuid, created_at, archived_at timestamptz null)

chore_completions(id, household_id, chore_id → chores ON DELETE SET NULL,
                  chore_title text,                 -- Snapshot für Historie
                  user_id, done_at timestamptz,
                  xp int, coins int, effort text,
                  flags text[],                     -- {'on_time','rescue','early','unpopular','swap'}
                  was_assigned_to uuid null,
                  prev_next_due date, prev_assignee uuid, prev_last_done_at timestamptz, prev_last_done_by uuid)

game_ledger      (id, household_id, user_id, xp int default 0, coins int default 0,
                  reason text,                      -- 'chore','level_up','quest','weekly_goal','streak','kudos','redeem','refund'
                  ref_id uuid null, created_at)
                  -- Saldo = SUM(); Index (household_id, user_id)

game_member_state(household_id, user_id, PK(household_id,user_id),
                  streak_current int, streak_best int, streak_last_day date,
                  joker_week date,                  -- Woche, in der der Joker verbraucht wurde
                  away_until date null, recap_seen_week date null)

household_game_state(household_id PK, energy int default 80, energy_low_notified bool,
                  week_start date, weekly_goal_xp int, goal_streak int,
                  paused_until date null, paused_since date null, timezone text default 'Europe/Berlin')

game_quests      (id, household_id, week_start, key, params jsonb, reward_coins int,
                  completed_at timestamptz null)

game_weeks       (household_id, week_start, PK(...), goal_xp, team_xp, goal_reached bool,
                  members jsonb,                    -- [{user_id, xp, count}]
                  quests jsonb, highlights jsonb)

user_badges      (household_id, user_id, badge_key, awarded_at, PK(household_id,user_id,badge_key))

rewards          (id, household_id, emoji, title, cost int check > 0, created_by, created_at, archived_at)
reward_redemptions(id, household_id, reward_id, title text, emoji text, cost int,
                  redeemed_by, redeemed_at, fulfilled_by null, fulfilled_at null, cancelled_at null)

chore_kudos      (completion_id → chore_completions ON DELETE CASCADE, user_id, emoji, created_at,
                  PK(completion_id, user_id))
```

**RPCs** (`public`, SECURITY DEFINER, `EXECUTE` nur `authenticated`, prüfen Mitgliedschaft und aktiven Haushalt):
- `complete_chore(chore_id) → jsonb`: Zeile sperren, XP und Münzen berechnen, Completion und Ledger schreiben,
  Frische und Zuteilung fortschreiben, Energie, Streak, Level-Up, Abzeichen und „room_shine“-Quest prüfen.
  Gibt `{xp, coins, flags, level_up, new_badges, quests_done, energy}` für die Feier-Animation zurück.
- `undo_chore_completion(completion_id)`
- `game_status() → jsonb`: Spielstand des aktiven Haushalts in einem Rutsch (pro Mitglied Level, XP gesamt,
  XP diese Woche, Münzen, Streak, Abzeichen; Energie; Wochenziel und Fortschritt; Quests mit Fortschritt;
  offene Gutscheine; ungesehener Rückblick). Der Client lädt das einmal und nach Realtime-Events debounced neu.
- `redeem_reward(reward_id)`, `fulfill_redemption(id)`, `cancel_redemption(id)`
- `give_kudos(completion_id, emoji)`
- `set_away(until date | null)`, `set_household_pause(until date | null)`
- `mark_recap_seen(week_start)`

**Cron** (`pg_cron` installieren, Jobs als `private.*`-Funktionen, Zeiten in UTC so gewählt, dass sie lokal passen):
- `game_daily` (täglich 02:00 UTC): Energie-Abzug, Streak-Joker/-Reset, Energie-Warnung ins Outbox.
- `game_weekly` (Mo 02:10 UTC): Vorwoche auswerten (`no_red`, Ziel, Bonus-Münzen, Abzeichen),
  `game_weeks` schreiben, neues Ziel und 3 Quests ziehen, Joker zurücksetzen.
- `game_digest` (täglich 06:30 UTC): Morgen-Übersicht pro Person ins Outbox.

**Migration der Altdaten** (entschieden 2026-11-26: *nicht* übernehmen — die 4 echten To-dos waren
erledigte App-Ideen, keine Haushaltsaufgaben). Ursprünglich geplant war: Die bestehenden `todos` werden als `chores` (`kind='once'`, Fälligkeit und
Zuständigkeit übernommen, `assign_mode` = fixed bzw. open) kopiert. Erledigte To-dos werden als Completion
mit 0 XP übernommen. Das betrifft die 4 echten Zeilen. **Weil das Daten verändert, frage ich vor dem Anwenden noch einmal nach.**
`todos` bleibt bis Meilenstein 5 stehen (nur lesbar, Trigger aus) und wird dann nach Rückfrage gelöscht.

**Realtime**: In die Publikation kommen `chores`, `chore_completions`, `reward_redemptions`,
`household_game_state` und `chore_kudos`. Chores werden zeilenweise angewendet (wie Todos heute), alle
anderen Events lösen ein debounced `game_status()` aus.

**Aktivität**: Trigger schreiben `chore_done` („Bad geputzt +24 XP“), `level_up`, `badge`,
`reward_redeemed` und `quest_done` ins `activity_log`.

**Push**: `private.push_outbox` wird verallgemeinert: `transaction_id` nullable, neu `kind text`,
`payload jsonb` und `recipient_ids uuid[] null` (null = alle anderen Mitglieder). `push_subscriptions` bekommt
`topics text[]` (Default: alle). `claim_push_event` filtert die Subscriptions nach Topic und Empfänger, und `compose()`
in `send-push` bekommt die Zweige `chore_done`, `reward_redeemed`, `energy_low` und `digest`. Finanzen laufen unverändert
über `kind='finance'`.

---

## 4. Oberfläche

### 4.1 Navigation
- Tab-Leiste: **Übersicht · Aufgaben · Einkauf · Finanzen · Mehr**. Der Aufgaben-Tab hat als Badge die Zahl der
  heute fälligen und überfälligen Aufgaben, die mir zugeteilt oder offen sind.
- Mehr-Menü: Die Kachel „Aufgaben“ wird zu **„Vorräte“** (Orte), daneben bleiben Produktsuche, Scannen und Rezepte.
- Router: `/todos` bekommt `meta.tab = 'tasks'`. Die Vorräte-Routen bekommen `tab: 'more'`.
  Unteransichten laufen über die Query `?view=quests|rooms|shop`, damit Push-Links gezielt öffnen können.

### 4.2 Aufgaben-Ansicht
```
┌─────────────────────────────────────────┐
│ 😄 Team-Energie  ████████████░░  84      │
│ Wochenziel  ◔ 230 / 320 XP · noch 3 Tage │
│ [■■■■■■■■■■░░░░░░] Du 62 % · Anna 38 %   │
│ (🧑 Lv 7 · 🔥12)   (👩 Lv 6 · 🔥4)  🪙 145 │
└─────────────────────────────────────────┘
 [ Aufgaben ] [ Räume ] [ Quests ] [ Shop ]
 [Für mich | Alle]

 ÜBERFÄLLIG ─────────────────────────── 2
 ○ 🛁 Bad putzen         ▓▓▓▓▓▓▓▓▓▓ 🔴  👩↻  +60 🦸
 ○ 🗑 Altpapier raus     ▓▓▓▓▓▓▓▓▓▓ 🔴  offen +15
 HEUTE ─────────────────────────────── 3
 ○ 🍽 Spülmaschine aus   ▓▓▓▓▓▓▓▓░░ 🟠  🧑↻  +10
 BALD ──────────────────────────────── 4
 ○ 🧺 Wäsche waschen     ▓▓▓▓▓▓░░░░ 🟡  ⚖️   +25 ⏱
 SPÄTER (eingeklappt) ──────────────── 12
 EINMALIG ──────────────────────────── 2
 ○ Fahrradschloss kaufen  📅 Fr      offen +10
            [ Neue Aufgabe …   ⚙  ↑ ]
```
- Rechts an jeder Zeile steht die XP-Vorschau mit Symbol für den Bonus (🦸 Rettung, ⏱ pünktlich). Das Avatar-Symbol zeigt Modus
  ↻ (abwechselnd), ⚖️ (fair), nichts bei fest, „offen“.
- **Erledigen**: Haptik, ein Kreis füllt sich, „+24 XP · +5 🪙“ fliegt hoch, kleines Konfetti. Bei Level-Up,
  neuem Abzeichen oder geschaffter Quest folgt eine Feier-Sheet. Danach kommt ein Toast mit Rückgängig.
- Wischen: links = löschen bzw. archivieren (mit Undo), rechts = „Abgeben an …“.
- Erledigte einmalige Aufgaben und die letzten Erledigungen stehen unter „Verlauf“ (eingeklappt), dort auch mit Kudos-Knopf.

### 4.3 Aufgabe anlegen/bearbeiten (`ChoreSheet`, ersetzt `TodoSheet`)
Titel · Raum (Chips + „Neuer Raum“) · **Wiederkehrend / Einmalig** ·
Intervall-Chips (Täglich, 2 T, 3 T, Wöchentlich, 2 Wo, Monatlich, Quartal, Eigene) bzw. Datum ·
„Zuletzt gemacht“ (Heute, Gestern, vor … Tagen, Nie) · Aufwand-Chips mit XP (Mini 5 · Klein 10 · Mittel 20 · Groß 40) ·
Schalter „Unbeliebt (+50 %)“ · Zuteilung (Segmented: Fest / Abwechselnd / Fair / Offen) mit Mitglieder-Avataren
zum An- und Abwählen und Sortieren per ↑↓ · „Jetzt dran: …“ · Notiz.
Die Schnellzeile unten legt wie bisher eine einmalige Aufgabe an (Klein, offen).

### 4.4 Räume
2-Spalten-Raster mit Kacheln: Emoji, Name, Zustands-Ring in %, „2 fällig“. Ein Tipp filtert die Liste. Räume verwalten
(umbenennen, sortieren, löschen) geht über einen Bearbeiten-Knopf.

### 4.5 Quests
Wochenziel-Karte (großer Ring, Fairness-Balken, Serie) · 3 Quest-Karten mit Fortschritt und Belohnung ·
„Endet in 3 Tagen“ · darunter das Abzeichen-Raster (erhalten bunt, gesperrt grau mit Bedingung) und die eigene Streak-Karte mit Joker-Status.

### 4.6 Shop
Münzstand · Belohnungsliste (Einlösen, deaktiviert mit „noch 35 🪙“) · „Offene Gutscheine“ in zwei Gruppen:
*für dich zu erfüllen* (Knopf „Erfüllt“) und *deine* (Stornieren innerhalb 24 h) · Verlauf · „Belohnung anlegen“
mit Vorschlagsliste.

### 4.7 Profil-Sheet (Tipp auf einen Avatar in der Team-Karte)
Level-Ring, Titel, XP bis zum nächsten Level, Streak (aktuell/best), Münzen, Abzeichen, kleine Statistik
(Erledigungen der letzten 8 Wochen als Balken, Lieblingsraum). Bei mir selbst zusätzlich „Ich bin weg bis …“.

### 4.8 Onboarding und Vorlagen
Ist der Haushalt noch leer, zeigt die Ansicht eine Willkommens-Karte mit kurzer Erklärung (3 Karten:
Frische · XP & Team · Shop) und dann die **Starter-Vorlagen**: ca. 25 Aufgaben in 6 Räumen (Küche, Bad,
Wohnzimmer, Schlafzimmer, Flur, Allgemein), vorausgewählt, mit Intervall und Stufe, alle abwählbar. Dazu die Frage
„Zuteilung: Abwechselnd zwischen allen / Offen“. Später erreicht man die Vorlagen über „Aus Vorlagen hinzufügen“.
Die Vorlagen liegen in `src/data/choreTemplates.ts`.

### 4.9 Dashboard
- `WidgetTodos` wird zu **„Heute dran“**: meine fälligen Aufgaben mit Frische-Punkt und XP, die Erledigen-Checkbox direkt im Widget.
- Neu **`WidgetTeam`** (`colSpan 2`): Energie, Wochenziel-Ring, beide Avatare mit Level, Streak und Münzen.
- Im Catalog in `WidgetGallery` unter einer neuen Sektion „Aufgaben“.

### 4.10 Einstellungen
- Push-Bereich: Schalter pro Topic (Finanzen · Morgen-Übersicht · Erledigt-Meldungen · Gutscheine · Energie-Warnung).
- Haushalt: „Pause für alle bis …“ (Urlaubsmodus Haushalt).

---

## 5. Code-Struktur

| Datei | Inhalt |
|---|---|
| `src/composables/useChores.ts` | Ersetzt `useTodos.ts`: Chores + Räume laden, CRUD mit Undo, `complete`/`undo`, `applyRemote`, Frische-Berechnung, Sortierung/Gruppen |
| `src/composables/useGame.ts` | `game_status()` laden und cachen, Realtime-Neuladen, Belohnungen und Gutscheine, Kudos, Urlaubsmodus |
| `src/utils/game.ts` | Reine Funktionen: `freshness`, `xpPreview`, `levelFromXp`, `levelTitle`, Konstanten. Die Server-Formel bleibt maßgeblich, die Client-Vorschau spiegelt sie (mit Kommentar-Querverweis). |
| `src/data/choreTemplates.ts`, `src/data/gameCatalog.ts` | Vorlagen, Quest-/Abzeichen-Texte und Emojis für die UI (die Logik dazu lebt in SQL) |
| `src/views/TodoView.vue` | Shell mit Team-Karte + Segment; Unteransichten in `src/components/chores/` |
| `src/components/chores/` | `TeamCard`, `ChoreRow`, `FreshnessBar`, `ChoreSheet`, `RoomGrid`, `QuestBoard`, `BadgeGrid`, `RewardShop`, `ProfileSheet`, `CelebrationSheet`, `WeeklyRecapSheet`, `OnboardingSheet` |
| `src/components/widgets/` | `WidgetTodos` (umgebaut), `WidgetTeam` |
| `supabase/functions/send-push/index.ts` | `compose()` um Aufgaben-Typen erweitert |
| `scripts/seed-test-data.sql` | Fixture: Räume, Chores in allen Frische-Zuständen und allen 4 Modi, Completions über 3 Wochen, Ledger, Quests, Abzeichen, Belohnungen, offener Gutschein, Energie 45 |

`App.vue` (Clear und Fetch beim Haushaltswechsel), `useRealtime.ts`, `TheTabBar.vue`, `MoreSheet.vue`,
`router/index.ts`, `useDashboard.ts`, `DashboardView.vue`, `WidgetGallery.vue` und `CLAUDE.md` (Composable-Tabelle,
Realtime, Push, Aufgaben-Abschnitt) werden entsprechend angepasst.

---

## 6. Meilensteine

Jeder Meilenstein ist für sich lauffähig, bekommt einen Changelog-Eintrag und wird im Test-Haushalt
verifiziert (Seed → UI durchspielen → Werte per `execute_sql` prüfen → neu seeden). Committet und
gepusht wird nur auf deine Anweisung.

**M1 – Navigation + neues Aufgabenmodell (2.3.0)**
- Tab-Tausch (Aufgaben rein, Vorräte ins Mehr-Menü).
- Migration: `chore_areas`, `chores`, `chore_completions`, `game_ledger`, `game_member_state` + RLS + RPCs
  `complete_chore` (XP, Münzen, alle Boni, alle 4 Zuteilungs-Modi, Streak ohne Joker), `undo_chore_completion`,
  `game_status` (Teil: Level, XP, Münzen, Streak). Datenübernahme der `todos` (nach Rückfrage).
- UI: neue Liste mit Frische-Balken, `ChoreSheet`, Räume als Feld, Team-Karte (ohne Energie/Ziel), Erledigen-Animation,
  Level-Up-Feier, Onboarding + Starter-Vorlagen, Widget „Heute dran“, Realtime, Aktivität.

*Stand M1:* umgesetzt wie oben, mit diesen Abweichungen: „Abgeben an …“ läuft über „Jetzt dran“ im
Editor statt über Rechts-Wischen. Aktivität nutzt den bestehenden Kind `todo_done`. Rotation und
Fair-Modus mit zwei Personen sind nur per Code-Review geprüft, weil der Test-Haushalt ein Mitglied hat.

**M2 – Team-Spiel (2.4.0)**
- `household_game_state`, `game_quests`, `game_weeks`, `user_badges`. `pg_cron` mit `game_daily` und `game_weekly`.
- Energie, Wochenziel + Fairness-Balken, Wochen-Quests, Streak-Joker, Abzeichen, Raum-Übersicht mit Zustand,
  Quests-Ansicht, Wochenrückblick, Urlaubsmodus (Person + Haushalt), `WidgetTeam`.

**M3 – Shop & Kudos (2.5.0)**
- `rewards`, `reward_redemptions`, `chore_kudos` + RPCs. Shop-Ansicht mit Gutscheinen, Vorschlagsliste, Kudos an
  Erledigungen und in der Aktivität, Profil-Sheet mit Statistik.

**M4 – Push für Aufgaben (2.6.0)**
- Outbox verallgemeinern, Topics an Subscriptions, Schalter in den Einstellungen, `game_digest`-Cron,
  Erledigt-Meldung, Gutschein-Meldung, Energie-Warnung, `send-push` erweitern und deployen.
  Getestet wird wie in 2.2.0 über Function-Logs, echte Zustellung nur im Build bzw. Deploy.

**M5 – Aufräumen**
- Nach Rückfrage: `todos`-Tabelle samt Trigger und Publikation löschen, `useTodos.ts`/`TodoRow.vue`/`TodoSheet.vue`
  entfernen, Doku finalisieren, Balance-Werte nach 2–3 Wochen echter Nutzung nachjustieren.

---

## 7. Offene Punkte / Risiken
- **Balance**: XP-, Münz- und Energie-Werte sind geschätzt. Ich plane nach ca. 2 Wochen einen Blick auf
  `game_weeks` ein (Ziel zu leicht oder zu schwer? Energie ständig bei 100 oder bei 0?).
- **Vertrauen statt Kontrolle**: Abhaken wird nicht von anderen bestätigt. Gegen Farmen helfen die Zu-früh-Regel,
  der 10-Minuten-Doppelschutz und die sichtbare Aktivität. Für einen Haushalt mit zwei Personen reicht das.
- **Zeitzone**: Alles rechnet in `household_game_state.timezone` (Default Europe/Berlin), die Cron-Zeiten
  in UTC verschieben sich mit der Sommerzeit um eine Stunde. Das ist unkritisch.
- **Ein-Personen-Haushalte**: Fairness-Balken, Kudos und Gutscheine (niemand zum Erfüllen) werden ausgeblendet.
  Belohnungen löst man dort selbst ein und hakt sie selbst ab.
