# Miku's Playroom

A playful, responsive invitation starring Hatsune Miku. The evasive No button escalates from a little dodge to a complete Miku takeover. An intentional Yes launches confetti and opens Discord in the same tab after 2.5 seconds.

## Run locally

Requires Node.js 20 or newer. No package installation is needed.

```sh
npm run dev
```

Open http://127.0.0.1:4173. Run `npm test` for interaction-state and geometry checks; `npm run build` creates the deployable `dist/` folder. Vercel reads `vercel.json` and publishes that folder.

## Customize

- **Discord invite:** `DISCORD_INVITE_URL` in `game.mjs`.
- **Taunts and intensity:** `TAUNTS` and `CHAOS` in `game.mjs`; speech reactions in `app.js`.
- **Artwork:** replace `assets/miku.webp`; update its alternative text and dimensions in `index.html` when necessary.
- **Colors, type, and layout:** `styles.css`.

The bundled artwork was created with the built-in ImageGen tool using this brief: “Hatsune Miku with turquoise twin-tails and a headset, reaching toward the viewer, anime cel shading, joyful expression, and teal/pink concert lighting.” The WebP is a compressed version of the generated source. This is an unofficial fan-made invitation.

## Interaction details

No evades mouse proximity, touch presses, and Enter/Space. Related pointer/click events count once. Every escape makes Yes dramatically larger; on the sixth escape, Yes fills the viewport and completely covers No. Until then, No finds a safe spot in the remaining space. The gesture that causes the takeover never accepts: click Yes deliberately, or press Tab and then Enter/Space. Covered page controls are removed from keyboard navigation until acceptance. Configure growth and the takeover threshold with `CHAOS.yesGrowth` and `CHAOS.takeoverAt` in `game.mjs`.

Reduced-motion preferences make growth and repositioning instant and simplify confetti. Particle counts remain capped. Accepting restores the readable confirmation and its real “Open Discord now” link before the same-tab redirect.

The site has no analytics, API keys, runtime dependencies, or audio. The deployable folder includes only website files and bundled artwork. Tests cover gesture deduplication, keyboard input, acceptance guard, escalation, redirect configuration, and viewport collision handling. Visual browser checks complement the automated state tests.
