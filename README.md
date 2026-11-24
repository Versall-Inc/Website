# Versall website

Homepage for Versall, the innovation company behind IntelliCourse, OVI and Pave.

Plain HTML, CSS and JavaScript. No build step and no dependencies.

## Structure

```
index.html                 page content and the logo sprite
assets/css/styles.css      all styles; brand colours are tokens at the top
assets/js/main.js          hero gradient (WebGL), cursor lens, card tilt, scroll effects
assets/img/favicon.svg     Versall mark
assets/img/partners/       partner and recognition logos
```

## Run locally

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploy

Any static host works. For GitHub Pages: push to `main`, then in the repository go to
Settings → Pages and choose "Deploy from a branch", branch `main`, folder `/ (root)`.

## Editing

- Venture copy, facts and partner logos live in `index.html`.
- Colours and type live in the `:root` block of `styles.css`.
- Hero gradient colours are set in `main.js` (`colors: [...]`).

## To do

- Contact: every "Get in touch" button links to LinkedIn until the Versall email is ready.
  Search `linkedin.com/company/versall` in `index.html` to swap them.
- Case studies: each venture card has a commented-out link. Uncomment it once the
  case study page exists.
