# B-Side Nexus

Hier entsteht der Rewrite unseres Portals, aktuell unter https://portal.b-side.ms zu finden.
Im neuen Gewand, mit neuer Technologie und unter neuem Namen geht der B-Side Nexus an den Start.

## Einrichten der Datenbank
- Setze eine lokale Postgres-Instanz auf.
- Postgres-Datenbank initialisieren (`npm run db:migrate`)
- Postgres-Datenbank mit den Daten füllen (`npm run db:populate`)

## Development
- NPM-Dependencys installieren (`npm i`)
- Env-Datei aus der `.env.skel` anlegen und befüllen
- `npm run dev` um Dev-Server zu starten
- Empfehlenswert ist zudem `npm run tsc:watch`, um TypeScript-Fehler frühzeitig zu erkennen
- Prettier und ESLint sind gut darin, Issues direkt beim Speichern zu fixen, die IDE daher entsprechend konfigurieren
