# SchulportalApp
Node.JS App für ein verbessertes Schulportal Hessen mit einem Frontend und einer vernünftigen JSON API mit allen vorstellbaren Funktionen

## Features

### Frontend
Das Frontend der App ist nur für Mobilgeräte gedacht und beinhaltet Funktionen wie:
- Vollwertiger Vertretungsplan
    - Pushbenachrichtigungen bei Änderungen im Plan *(Service Worker)*
    - Alle Funktionen des normalen Vertretungsplans
- Anzeige des eigenen Stundenplans
- Abgaben bei Moodle
- Persönlicher Kalender
    - Export der Daten als iCal-Abo
- Durchgehendes Angemeldetbleiben
    - Normales Schulportal loggt Nutzer immer wieder aus

> Screenshot der Hauptseite:
<img src="https://i.imgur.com/2n1SxHI.png" height="300">

### API (Backend)
Die API wird vom Frontend genutzt, um direkt Daten abzurufen. Diese hat einige Endpoints zum Abfragen gewisser Daten:

- POST /api/login
    - Einloggen mit Name, Passwort und Schul-ID
    - Gibt Session-ID und Token zurück
- POST /api/autologin
    - Generiert ein Autologin-Token, welches zum erneuten Einloggen genutzt werden kann
    - Wird von Subscriptions verwendet
- POST /api/check
    - Überprüft ein Token nach der Gültigkeit
    - Diese laufen nach kurzer Zeit ab
- GET /api/vertretungsplan
    - Zeigt den Vertretungsplan für die nächsten zwei Tage an
- GET /api/stundenplan
    - Listet alle Stundenpläne für den Nutzer auf
- POST /api/calendar
    - Gibt Kalendereinträge für die gegebene Zeit an
- GET /api/calendar/export
    - Zeigt die URL für das iCal-Abo des Kalenders
- GET /api/messages
    - Gibt die Direktnachrichten des Nutzers zurück
- GET /api/rsa/key
    - Zeigt den Public Key des Schulportal an
    - Wird geladen von [hier](https://start.schulportal.hessen.de/ajax.php?f=rsaPublicKey)
- POST /api/rsa/handshake
    - Führt mit dem Server des Schulportal einen Handshake durch, um Nachrichten zu entschlüsseln
- POST /api/moodle/login
    - Loggt den User mit Session-ID in das SchulMoodle ein
    - Benötigt für Abgaben bei Moodle
- POST /api/moodle/events
    - Listet alle fälligen Abgaben in Moodle auf
- GET /api/status
    - Zeigt den Status aller Systeme des Schulportals an
    - Wird geladen von [hier](https://info.schulportal.hessen.de/status-des-schulportal-hessen/)
- POST /api/worker/subscribe
    - Abonniert die Pushbenachrichtigungen des Vertretungsplans
    - Folgt dem Syntax des Payloads der Push API
- GET /api/worker/key
    - Zeigt den Public Vapid Key zur Erstellung einer Push Subscription auf dem Client
- POST /api/worker/submit
    - Speichert das Token für das Überprüfen des Vertretungsplans
- POST /api/worker/check
    - Überprüft ob die Push Subscription auf dem Server noch existiert
- POST /api/worker/remove
    - Entfernt eine Push Subscription aus der Datenbank

## Nutzung
Die App benötigt Node.JS *(am besten eine neue Version)* und TSC zum Compilen des TypeScript-Source Codes. Die Webapp läuft standardmäßig auf Port 80 und verbindet sich mit einer MongoDB-Datenbank zum Speichern der Push API-URLs.

### Benötigte ENVs
- **VAPID_KEY_PRIVATE:** Privater Key des Vapid-Keysets für die Push API
- **VAPID_KEY_PUBLIC:** Öffentlicher Key, wird auch an den User gegeben
- **DATABASE_URL**: URL zur MongoDB-Datenbank
- **DATABASE_SHARD**: URL zu einer Shard der Datenbank (zum Testen der Rate Limits)
- **PORT**: HTTP-Port zum Hosten der Seite