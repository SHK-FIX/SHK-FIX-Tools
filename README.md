# SHK FIX – Abwasser-Aufmaß

Offlinefähiger V1-Prototyp für iPhone und iPad.

## Ziel
Monteure erfassen ein Abwasser-Aufmaß vor Ort, speichern alles lokal und übergeben die Zusammenfassung anschließend über das normale iOS-Teilen an Mail oder WhatsApp.

## V1-Klickweg
1. Projektdaten anlegen
2. Aufmaß starten
3. Bereiche erfassen
   - Fallleitung
   - Grundleitung
   - Anschlussleitungen
   - Brandschutz
   - Material
   - Fotos & Notizen
4. Aufmaßdauer in 15-Minuten-Schritten auswählen
5. Zusammenfassung prüfen
6. PDF/Drucken
7. `An Büro senden` → normales iOS-Teilen → Mail oder WhatsApp

## Zeiterfassung
Kein laufender Timer. Die Dauer wird bewusst robust in 15-Minuten-Schritten gewählt: 15, 30, 45, 60, 75 Minuten usw.

## Offline-Prinzip
- Projektdaten und Positionen liegen lokal im Browser (`localStorage`).
- Ein Service Worker cached die App-Oberfläche für Offline-Nutzung nach dem ersten erfolgreichen Laden.
- Mail/WhatsApp benötigen erst beim tatsächlichen Versand eine Internetverbindung.

## Versandstatus
Die App sollte fachlich von `zum Versand übergeben` sprechen, nicht automatisch von `gesendet`, weil das iOS-Teilen nicht zuverlässig zurückmeldet, ob der Nutzer den Versand wirklich abgeschlossen hat.

## Technik
- HTML/CSS/JavaScript ohne Framework
- PWA-Manifest
- Service Worker
- Web Share API für das iOS-Teilen
- Print-Ansicht als erste PDF-Lösung

## Nächste sinnvolle Schritte
- echte PDF-Datei lokal erzeugen und als Datei teilen
- Fotos lokal speichern und Positionen zuordnen
- bereichsspezifische Felder für Brandschutz, Anschlussleitungen und Grundleitung
- automatische Materialzusammenfassung
- Projektliste mit Entwurf/Abgeschlossen/Zum Versand übergeben
- App-Icons und `apple-touch-icon`
- später optional native iOS-Verpackung, falls PWA-Grenzen stören
