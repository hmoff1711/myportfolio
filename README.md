# The Night Shift

Hikmat Mahammadov’s professional portfolio and a playable coastal
adventure. Walk between islands, redirect a beam through two reflectors, push
a counterweight to lower a bridge, and carry a lens home to the lighthouse.
AFTERLIGHT extends the coast with four freely accessible worlds: the Observatory,
Time Garden, Resonance Room and Midnight Cinema. Twelve original fictional
discoveries connect their stories. The game is fiction; the professional
journal records real infrastructure work.

## Local preview

The site is static HTML, CSS and JavaScript. No build or dependency installation
is required. For local preview, use Node.js 18 or later from the repository root:

```sh
node scripts/serve.mjs
```

Open `http://127.0.0.1:4173/myportfolio/`. The server binds only to loopback and
reproduces the GitHub Pages `/myportfolio/` base path. Set `PORT` to choose another
port. Stop the process with Ctrl+C. Serve through HTTP; ES modules require more
than opening `index.html` as a local file.

## Playing and reading

Use WASD or the arrow keys to walk, or click/tap reachable ground. Press E or
the nearby action button to interact. The on-screen direction buttons provide
another way to move. Push the counterweight from its left side toward the plate.
Hints describe the current task. There is no time limit or failure penalty.

The help menu can return the keeper to the landing without losing progress, or
restart the adventure. Progress is stored locally in `hikmat-night-shift-v1`;
unavailable browser storage does not prevent play. Sound starts muted and is
enabled only through its button. The detail control reduces rendering cost.

Open Worlds & discoveries to visit any AFTERLIGHT destination without finishing
the coast. The atlas provides keyboard-operable destination and landmark buttons;
selecting a landmark starts a walking route. Align the observatory rings, cross
a bridge in yesterday, play the chimes, build a four-voice loop, or visit the
cinema. Found stories can be reread from the atlas.

AFTERLIGHT discoveries, puzzle progress, loop notes and tempo are saved locally
under `hikmat-afterlight-v1`, separately from the coast. Open tabs merge earned
discoveries and milestones before saving, so an older tab cannot erase them.
Browser storage is optional; saves do not synchronize between devices. Three original miniature
films play in real time, with pause and frame-by-frame reading controls.
Reduced motion starts films in reading mode and suppresses decorative movement.

Profile, expertise, case notes, employment, education, contact information and
downloads are independent of quest progress. The journal loads independently
of the game. Its content exists in HTML and remains readable without JavaScript;
native `details` elements open the case notes and expertise subjects. The 3D
adventure requires a browser with WebGL 2. If it cannot initialize, the portfolio
and downloads remain available.

Existing `#top`, `#focus`, `#expertise`, `#work`, `#experience`, `#background`,
`#contact`, `#layer-*` and `#case-*` links remain supported. Journal navigation
uses fragments, with Back/Forward support. Printing exposes the professional
content. Reduced-motion preferences suppress decorative movement.

## Structure

- `index.html`: complete professional content, metadata, game controls and
  fallback entry points.
- `css/style.css`: adventure layout, responsive controls and reading fallback.
- `js/main.js`: optional adventure loader and initialization fallback.
- `js/game.js`: renderer, camera, controls, interaction, sound and local progress.
- `js/world.js`: original procedural coast, keeper, lighthouse and animated props.
- `js/quest-state.mjs`: deterministic quest rules, collision bounds, navigation
  and save validation, independent of the renderer.
- `css/journey.css`, `js/journey.js`: AFTERLIGHT atlas, exploration controller,
  discoveries, pocket orchestra, films and local progress.
- `js/journey-state.mjs`: world routes, puzzle rules, sequencer and save validation.
- `js/universe-world.js`: original procedural scenery for the four worlds.
- `js/afterlight-content.js`: original fiction, film scripts and design ideas;
  these do not assert biographical traits or project achievements.
- `css/dossier.css`, `js/dossier.js`: professional journal, accessible dialog
  navigation, deep links, native contact form and print behavior.
- `vendor/three/`: self-hosted Three.js runtime and its license.
- `cv/Hikmat_Mahammadov_Resume.pdf`, `cv/hikmat.vcf`: original downloads, unchanged.
- `robots.txt`, `sitemap.xml`: public indexing endpoints.

## Content boundaries

Professional claims come from the original portfolio and Resume. Supporting
fundamentals are separated from documented practice. Cisco coursework is not
presented as professional certification.

- OneFS: tested access paths matched the model; new files still require the
  owner-repair control, and native ownership remains open.
- ProFTPD: hardening validated; throughput investigation remained open along
  the network/QoS/provider track. Reported speeds compare time windows.
- Remote Access Plus: HTTPS/certificate/pilot controls validated; wider rollout
  stays behind the unattended-install quality gate.
- SMB: only the matching credential target was removed.
- MFP: DNS resolution was restored; mail delivery has a separate validation step.

The contact form preserves the native POST to Airform. Browser validation runs
before navigation. The site does not claim delivery success; Airform handles
the external response. Email, phone, LinkedIn, GitHub, WhatsApp, Resume and vCard
remain directly accessible.

## Verification

```sh
node --test scripts/test-quest.mjs scripts/test-journey.mjs scripts/verify.mjs
```

The quest tests exercise movement, reflection, physical pushing, bridge access,
the complete journey, interaction prerequisites and saved-state validation.
AFTERLIGHT tests cover all four worlds, reachable landmarks, puzzle prerequisites,
the twelve discoveries, loop notes and tempo, films, save restoration and renderer
state changes. These state and scene checks do not replace interaction tests.
Static checks cover source content, fragments, asset paths, the local module
graph, metadata, native form fields, licensing and unchanged download hashes.

These checks do not establish browser rendering or external message delivery.
Before publishing, exercise the coast and all four worlds using keyboard and pointer,
mobile-sized layouts and touch controls, journal focus/escape behavior, deep
links and Back/Forward, no-JavaScript and WebGL failure states, reduced motion
and print. Check discovery rereading, loop and tempo persistence, films in both
playback and reading modes, and return to the coast. A real mobile device remains
a separate check from viewport resizing.
Do not send a test message to Airform without intent to send it.

## Third-party runtime and hosting

Three.js **0.180.0** is vendored as `three.module.js` and `three.core.js` from the
official npm package. It is distributed under the MIT license; the original
copyright and license text are retained in `vendor/three/LICENSE`. Runtime
imports use local relative URLs, without a CDN dependency.

Serve the repository root on GitHub Pages at `/myportfolio/`. ES modules must be
served with a JavaScript MIME type, including `.mjs`. No client-route fallback
or server-side application is needed. Publishing and GitHub Pages configuration
changes are separate actions; this local development stage does not deploy the site.
