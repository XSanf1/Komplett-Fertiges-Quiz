# Quizshow – Multiplayer-Buzzer

Eine Quizshow-Webapp mit gemeinsamem Spielcode, Live-Punktestand, Kategorien mit 100–500 Punkten und Buzzer auf jedem Gerät. Antworten werden frei gesagt; es gibt keine Multiple-Choice-Auswahl.

## Öffentlich veröffentlichen (Render)

Diese ZIP ist für einen Node.js-Host vorbereitet und enthält `render.yaml`. Für eine öffentliche Webseite muss der Code in ein GitHub-Repository hochgeladen und anschließend bei Render verbunden werden. Das benötigt eigene Konten und eine Bestätigung durch dich; ich kann mich nicht in deine Konten einloggen oder sie ohne deine Freigabe erstellen.

1. Entpacke die ZIP auf einem PC.
2. Lade den gesamten Ordner in ein neues GitHub-Repository hoch.
3. Öffne https://render.com, melde dich an und verbinde das Repository.
4. Lass Render die `render.yaml` erkennen und erstelle den Web Service.
5. Nach dem Deployment gibt Render dir eine öffentliche HTTPS-Adresse. Schicke diese Adresse deinen Freunden; jeder tritt mit dem Spielcode bei.

Hinweis: Der kostenlose Hosting-Tarif kann den Dienst bei Inaktivität schlafen legen. Der erste Aufruf danach kann etwas dauern. Die App nutzt WebSockets für Live-Buzzer.

## Lokal starten

1. Installiere Node.js 18 oder neuer: https://nodejs.org/
2. Entpacke diesen Ordner.
3. Öffne im Ordner ein Terminal / eine Eingabeaufforderung.
4. Führe `npm install` und danach `npm start` aus.
5. Öffne http://localhost:3000 auf deinem PC.

`localhost` funktioniert nur auf dem Gerät, auf dem der Server läuft. Spieler und Punktestände werden im Arbeitsspeicher gehalten und gehen verloren, wenn der Server neu startet. Das ist ein einfacher Prototyp für private Spielrunden.
