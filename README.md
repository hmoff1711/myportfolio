# The Night Shift

Hikmat Mahammadov’s professional portfolio and a small playable coastal
adventure. Walk between islands, redirect a beam through two reflectors, push
a counterweight to lower a bridge, and carry a lens home to the lighthouse.
The game is fiction; the professional journal records real infrastructure work.

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
node --test scripts/test-quest.mjs scripts/verify.mjs
```

The quest tests exercise movement, reflection, physical pushing, bridge access,
the complete journey, interaction prerequisites and saved-state validation.
Static checks cover source content, fragments, asset paths, the local module
graph, metadata, native form fields, licensing and unchanged download hashes.

These checks do not establish browser rendering or external message delivery.
Before publishing, exercise the full adventure using keyboard and pointer,
mobile-sized layouts and touch controls, journal focus/escape behavior, deep
links and Back/Forward, no-JavaScript and WebGL failure states, reduced motion
and print. A real mobile device remains a separate check from viewport resizing.
Do not send a test message to Airform without intent to send it.

### Local verification checkpoint — 2026-10-04

- 24 automated checks passed, including a complete quest through movement,
  interaction, bridge access, lens delivery and saved-state restoration.
- Local HTTP checks passed for the `/myportfolio/` page, module graph,
  stylesheets and Resume, including JavaScript MIME types for `.mjs`.
- Desktop browser interaction verified walking, both reflectors, the moving
  counterweight, the lowered bridge, carrying the lens and restored progress.
- The browser exposed all professional sections with JavaScript disabled and
  opened the profile journal from a direct fragment at a mobile viewport.
- Later browser automation stopped returning reliable screenshots and input,
  including with JavaScript disabled. Final lighthouse presentation, complete
  responsive visual review, touch input, modal history and print still need
  browser verification. Physical mobile devices and Airform delivery were not
  tested. No deployment was performed.

## Third-party runtime and hosting

Three.js **0.180.0** is vendored as `three.module.js` and `three.core.js` from the
official npm package. It is distributed under the MIT license; the original
copyright and license text are retained in `vendor/three/LICENSE`. Runtime
imports use local relative URLs, without a CDN dependency.

Serve the repository root on GitHub Pages at `/myportfolio/`. ES modules must be
served with a JavaScript MIME type, including `.mjs`. No client-route fallback
or server-side application is needed. Publishing and GitHub Pages configuration
changes are separate actions.
