# AION II Checklist

A responsive, no-build static checklist. It tracks daily and weekly activities, per-character progress, reset countdowns, and Shugo Festival alerts. Progress is saved in the current browser with `localStorage`.

## Project structure

```text
.
├── index.html
├── README.md
└── assets/
   ├── audio/
   │   └── shugo.mp3
   ├── css/
   │   └── styles.css
   ├── icons/
   │   ├── assassin.png
   │   ├── chanter.png
   │   ├── cleric.png
   │   ├── gladiator.png
   │   ├── ranger.png
   │   ├── sorcerer.png
   │   ├── spiritmaster.png
   │   └── templar.png
   └── js/
      └── app.js
```

Keep `index.html` at the repository root for the GitHub Pages configuration below. Asset links are relative so they work both locally and from a repository subpath.

## Run locally

With Python 3 installed, open a terminal in this folder and run:

```powershell
py -m http.server 8000
```

Then visit <http://localhost:8000>. Stop the server with `Ctrl+C`. On macOS or Linux, use `python3 -m http.server 8000` instead.
