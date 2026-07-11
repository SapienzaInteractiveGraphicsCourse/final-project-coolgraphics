# Night at the Museum

Night at the Museum is a browser-based interactive 3D scene built with
Three.js, JavaScript ES modules, tween.js and Vite. The player controls a museum
security guard and explores a central atrium connected to four themed rooms:
the dinosaur room, statue room, Egyptian room and painting gallery.

The project combines real-time rendering, hierarchical animated models,
procedural animation, raycast-based interaction, collision handling, multiple
camera modes, configurable lighting, texture maps, shadows, fog and an
HTML-based control panel.

## How to Run

**Live demo (GitHub Pages):** https://sapienzainteractivegraphicscourse.github.io/final-project-coolgraphics/ 


## Controls

| Input | Action |
| --- | --- |
| `W` / `S` | Move forward and backward relative to the player direction |
| `A` / `D` | Rotate the player |
| `C` | Cycle between third-person, first-person, top-down and panorama cameras |
| `O` | Open the nearest door when the player is close and facing it |
| `T` | Trigger the global museum awakening event |
| `H` | Hide/show HTML panel |
| Mouse drag | Orbit the camera, or adjust pitch in first-person mode |
| Mouse wheel | Zoom the perspective camera |
| Mouse click | Interact with clickable exhibits and paintings |
| UI panel | Change lighting mode, shadows, rendering quality and light intensities |

## Environment and Libraries

The application runs as a static browser project. `index.html` provides the page
shell and the `ui-root` container, while the WebGL canvas is created at runtime
by `THREE.WebGLRenderer`.

| Library or API | Use |
| --- | --- |
| `three` | WebGL rendering, scene graph, cameras, lights, shadows, geometries, materials, textures and math utilities |
| `GLTFLoader` | Loading local `.glb` models such as the player, T-Rex, Moai statue, coffin, mummy and museum props |
| `@tweenjs/tween.js` | Timed animations for doors, sarcophagus lid, Moai mouth motion, statue hopping and player walk blending |
| Vite | Development server and production build tool |
| Browser Canvas 2D API | Runtime procedural textures converted into `THREE.CanvasTexture` |

## Documentation

The full **technical presentation and user manual** is in[`Documentation.pdf`](Documentation.pdf).
