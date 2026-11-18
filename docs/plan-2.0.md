# Magaziner 2.0 – Upgrade-Plan

Stand: 2026-11-18 · Basis: `master` @ 7fa8b36 (Release 0.8.0)

Ziel: Bedienung und Optik deutlich verbessern und die gesammelten Fehler und Ärgernisse
ausbügeln. Ausgeliefert wird in sechs Meilensteinen, jeder als eigener PR, der für sich
lauffähig ist. 2.0.0 wird erst mit M6 getaggt; vorher erscheinen 0.9.x-Releases mit
kleinen Changelog-Einträgen.

---

## Befund (aus Code-Review und Durchklicken der App)

### Fehler
| # | Problem | Ort |
|---|---------|-----|
| B1 | **Stored XSS:** Rezeptbeschreibungen laufen ungefiltert durch `marked` in `v-html`. Jedes Haushaltsmitglied (also auch jeder, der einen Einladungslink nutzt) kann Script einschleusen. | `RecipeDetailView.vue:173` |
| B2 | **Datum um einen Tag verschoben:** `new Date().toISOString().split('T')[0]` liefert das UTC-Datum. Zwischen 0 und 1 bzw. 2 Uhr nachts wird so „gestern“ vorausgefüllt (Ausgaben, Öffnungsdatum, Scanner). An 10 Stellen. | ItemRow, ExpenseWizard, PaymentWizard, FinanceView, LocationDetailView, ScannerAddView |
| B3 | Automatik für den Mindestbestand: Die Duplikatprüfung zählt auch *abgehakte* Einträge (das Produkt wird also nie wieder nachgetragen). `.maybeSingle()` schlägt bei mehreren Treffern fehl und erzeugt dann ein weiteres Duplikat. Außerdem erscheint der `alert()` noch *vor* dem Insert. | `useInventory.ts:180-214` |
| B4 | „Geöffnet“ lässt sich im Bearbeiten-Dialog nur für die *erste* Instanz setzen. | `ItemRow.vue:89-152` |
| B5 | Der Rollback in `updateItem` stellt `minimum_stock` nicht wieder her. | `useInventory.ts:400-421` |
| B6 | Beim Haushaltswechsel können verspätete Antworten aus dem alten Haushalt die neuen Daten überschreiben (kein Abbruch, kein Abgleich). | `App.vue` (`refetchAllData`) |
| B7 | Auch öffentliche Seiten (Passwort vergessen/ändern, `/join`, OAuth-Callback) bekommen Navbar und Drawer, nur `/login` ist ausgenommen. | `App.vue:94` |
| B8 | Fehler in Todos, Einkaufsliste und Rezepten landen nur in `console.error` und der Nutzer merkt nichts davon (63 Stellen). | Composables |
| B9 | Die Produktsuche ignoriert Umlaute nicht („Muesli“ findet „Müsli“ nicht), obwohl `utils/text.ts` das für Finanzen schon kann. | `AllItemsView.vue` |
| B10 | Das Löschen-„X“ für Kategorien sitzt mitten im Formular „Neues Produkt“ und löscht ohne Rückfrage. | `LocationDetailView.vue:194` |

### Ärgernisse
- 25 native `alert()`/`confirm()`-Dialoge neben drei verschiedenen Modal-Techniken (`<dialog>`, `modal-open`, eigenes `fixed`-Div).
- Navigation läuft nur über das Hamburger-Menü. Ein Zurück-Pfeil gibt es nur bei Ort und Rezept, nicht bei „Alle Vorräte“ und Scanner. Ein Tipp auf den Seitentitel springt zum Dashboard.
- Keine Live-Synchronisierung: Wenn zwei Personen gleichzeitig einkaufen, sieht keine die Häkchen der anderen.
- Dashboard-Layout und „Letzte Aktivität“ liegen in `localStorage`. Auf einem neuen Gerät sind sie weg, und die Aktivität anderer Mitglieder sieht man nie.
- Finanzen: Beim ersten Öffnen müssen alle Personen von Hand angelegt werden, obwohl die Haushaltsmitglieder schon bekannt sind. Neu anlegen läuft über einen Wizard, bearbeiten über alte Inline-Modals (614 Zeilen in `FinanceView.vue`).
- Einkaufseinträge und Todos lassen sich nicht bearbeiten. Todos haben weder Fälligkeit noch Zuständigkeit noch Wiederholung.
- Drei verschiedene App-Namen: „Mein Haushalt“ (`<title>`), „Mein Haushalts-Manager“ (Manifest), „Magaziner“.
- `theme-color` ist auch im Dark Mode fest `#ffffff`. `user-scalable=no` sperrt Zoom (Barrierefreiheit). Safe-Area-Insets fehlen.
- Kleine Tippziele (`btn-xs` für +/− im Vorrat), abgeschnittene Widget-Titel („ZUSTAND DE…“), leere Widgets nehmen viel Platz ein.
- Bundle: ein einziger Chunk über 500 kB, 1,1 MB im Precache. Chart.js, QR-Reader und `marked` werden immer geladen.
- Kein Type-Check im Build (`vite build` prüft keine Typen), 34× `any`.

### Supabase-Advisors
- Schutz vor geleakten Passwörtern ist aus (Auth-Einstellung, 1 Klick).
- 3× `SECURITY DEFINER` für `authenticated` ausführbar: so gewollt (`accept_household_invite`, `delete_my_account`, `transfer_household_ownership`), nur dokumentieren.
- Hinweis: CLAUDE.md beschreibt RLS mit `is_household_member()`. Die Policies nutzen inzwischen `private.is_active_household()`, die Beschreibung sollte angepasst werden.

---

## M1 – Fundament (unsichtbar, macht alles andere möglich)
**Umfang: M**

1. **Feedback-System:** `useToast()` (Snackbar mit optionaler „Rückgängig“-Aktion) und `useConfirm()` (Promise-basiertes Bottom-Sheet). Damit werden alle `alert`/`confirm` ersetzt. Composables geben Fehler einheitlich als Toast aus (B8).
2. **`BottomSheet.vue`** als einzige Modal-Komponente: Fokusfalle, Swipe-to-close, Keyboard-Inset, Safe-Area. Alle drei bisherigen Modal-Techniken werden nach und nach darauf umgestellt.
3. **`utils/date.ts`:** `todayLocalISO()`, `formatDate()`, `daysUntil()`. Behebt B2 und vereinheitlicht die Ablauf-Logik aus ItemRow, useDashboardStats und Widgets.
4. **Sicherheit:** DOMPurify für Markdown (B1). In Supabase den Schutz vor geleakten Passwörtern einschalten.
5. **Build:** `vue-tsc --noEmit` ins `build`-Script. Routen per `() => import()` lazy laden, Chart.js, Scanner und Markdown in eigene Chunks.
6. **Haushaltswechsel absichern (B6):** Generation-Counter in den Fetches, veraltete Antworten werden verworfen.

## M2 – App-Shell & Navigation
**Umfang: M**

1. **Bottom-Tab-Bar** als Hauptnavigation: *Übersicht · Vorräte · Einkauf · Finanzen · Mehr*. „Mehr“ öffnet ein Sheet mit Aufgaben, Rezepten, Einstellungen und dem Haushaltswechsel. Der Drawer entfällt.
2. **Einheitlicher Header:** Zurück-Pfeil auf allen Unterseiten (mit History-Fallback). Der Titel ist nicht mehr klickbar. Seitenspezifische Aktionen kommen rechts in einen Header-Slot.
3. **Shell-Layouts per Route-Meta** (`layout: 'bare' | 'app'`). Behebt B7.
4. **`AppFab.vue`:** ein FAB pro Seite, sitzt über der Tab-Bar und verdeckt keinen Inhalt mehr.
5. PWA: einheitlicher Name **„Mein Magaziner“**, `theme-color` folgt dem Theme, `viewport-fit=cover` mit Safe-Area-Padding, Zoom wieder erlauben.

## M3 – Design-System & Visuals
**Umfang: M–L**

1. **Eigene DaisyUI-Themes** `magaziner-light` / `magaziner-dark`: eigene Primärfarbe, wärmere Neutraltöne, Radius- und Schatten-Skala, Variable Font (z. B. Inter oder Figtree).
2. Theme-Auswahl **Hell / Dunkel / System**, bisher gibt es nur einen Umschalter.
3. **Icons:** Navigation und Aktionen nutzen konsequent Heroicons. Emoji bleibt Nutzerinhalt (Ort-Icons, Kategorien).
4. **Bausteine:** `EmptyState`, `SectionHeader`, `ListRow`, `Skeleton`, `Stepper` (+/− mit 44-px-Tippzielen).
5. **Dashboard:** persönliche Begrüßung („Guten Abend, Fabian“), kompakte Stat-Kacheln, Null-Zustände in einer Zeile statt großer Karten, keine abgeschnittenen Titel, Skeletons beim Laden.
6. **Mikro-Interaktionen:** `TransitionGroup` für Listen, Haptik (`navigator.vibrate`) beim Abhaken, Swipe-Aktionen auf Zeilen.

## M4 – Einkaufsliste & Aufgaben
**Umfang: L**

1. **Realtime** (Supabase Realtime, `postgres_changes` gefiltert auf `household_id`) für Einkaufsliste und Todos. Das Highlight von 2.0.
2. Einkaufseinträge **bearbeiten** (Titel, Menge/Notiz). **Wischen zum Löschen mit Rückgängig**: Das löst das Fehltipp-Problem aus 0.6.1, ohne dass der einzelne Löschen-Weg wieder wegfällt.
3. **Autovervollständigung** aus bisherigen Einträgen und Vorräten.
4. **„In den Vorrat übernehmen“:** abgehakte Einträge mit einem Tipp in einen Ort buchen.
5. Rezept → Liste als Batch-Insert mit Toast statt sequentiell ohne Feedback.
6. **Todos:** bearbeiten, Fälligkeitsdatum, Zuständige (Haushaltsmitglied), Wiederholung (täglich/wöchentlich/monatlich), erledigte einklappbar und gesammelt löschen (wie bei der Einkaufsliste). *DB-Migration:* `due_date`, `assignee_id`, `recurrence`.

## M5 – Vorräte & Scanner
**Umfang: L**

1. **Produkt-Detail-Sheet** statt versteckter Klickflächen: alle Instanzen mit eigenem Öffnungsdatum (B4), in einen anderen Ort verschieben, löschen, Mindestbestand, anpinnen.
2. **Kategorien verwalten** über ein eigenes Sheet im Ort-Header, mit Umbenennen und Löschen samt Rückfrage (B10). Ort bearbeiten oder löschen auch direkt aus der Detailseite, die Rückfrage nennt die Anzahl der Produkte.
3. **Suche:** umlaut-tolerant (B9), Filter-Chips *Abgelaufen · Bald fällig · Geöffnet · Unter Mindestbestand*, Suche innerhalb eines Orts.
4. **Mindestbestand-Automatik neu (B3):** Toast mit „Rückgängig“, Abgleich nur gegen offene Einträge, Ziel-Liste einstellbar.
5. **Scanner:** Barcode → Produkt im Haushalt merken. Ein erneuter Scan erkennt das Produkt sofort und bietet „+1“ an, ohne OpenFoodFacts zu fragen. *DB-Migration:* `items.barcode`.
6. **Aktivitätsprotokoll serverseitig** (`activity_log`-Tabelle, per Trigger befüllt). „Letzte Aktivität“ zeigt dann, *wer* was gemacht hat, über alle Geräte hinweg. Behebt auch B5 nebenbei beim Umbau.

## M6 – Finanzen, Rezepte, Einstellungen → Release 2.0.0
**Umfang: M–L**

1. **Finanz-Personen ↔ Haushaltsmitglieder:** Beim ersten Öffnen werden Personen aus den Mitgliedern vorgeschlagen, mit Avatar. Freie Namen für Nicht-Nutzer bleiben möglich. *DB-Migration:* `finance_members.user_id` (nullable).
2. **Bearbeiten über den Wizard.** Die Inline-Modals in `FinanceView.vue` entfallen, die Datei schrumpft deutlich.
3. **„Ausgleichen“-Vorschlag:** minimale Überweisungen („Anna → Ben 23,40 €“), mit einem Tipp als Zahlung erfassbar.
4. **Rezepte:** Bild-Upload in Supabase Storage (bisher nur URL), Portionen skalieren, Abgleich der Zutaten mit dem Vorrat („hast du schon“).
5. **Dashboard-Layout pro Nutzer in der DB** (`user_profiles.dashboard_layout jsonb`), mit Migration aus `localStorage`.
6. **Changelog 2.0.0** mit eigenem „Willkommen bei 2.0“-Pop-up (mehrseitig, mit Screenshots der Highlights).
7. CLAUDE.md aktualisieren (neue Bausteine, RLS-Beschreibung, Konventionen für Toast/Sheet).

---

## Bewusst nicht in 2.0
- Offline-Schreibwarteschlange (Sync-Konflikte zu aufwendig). In 2.0 nur ein Offline-Banner.
- Push-Benachrichtigungen für Ablaufdaten (braucht Edge Function und Web-Push-Setup) → Kandidat für 2.1.
- Test-Runner-Einführung → separat entscheiden. Bis dahin bleibt die Verifikation über Fixture und Browser.

## Offene Entscheidungen
1. **Tabs der Bottom-Bar:** Ist *Übersicht · Vorräte · Einkauf · Finanzen · Mehr* richtig, oder sollen Aufgaben statt Finanzen direkt erreichbar sein?
2. **Markenfarbe und Schrift:** eigener Vorschlag in M3, oder gibt es Vorgaben?
3. **Finanz-Personen an Konten koppeln (M6.1):** Das ist eine Schema-Änderung auf Produktionsdaten und braucht eine Migration der bestehenden Namen.
4. **Reihenfolge:** M4 (Realtime) vor M3 ziehen, wenn das gemeinsame Einkaufen der größte Schmerz ist?
