# True 3D inspection update

Baseline: ce3d6d33daf405cdd1076398da5c3d49bf0ceff4. Existing 23-scene content, navigation, Pages workflow and other interactions are preserved.

## Implementation

- Locally bundled Three.js 0.180.0 + GLTFLoader; no runtime third-party CDN.
- Real Reaver GLB with geometry, rig, UVs and embedded maps. Static PNG is retained only as loading/WebGL-failure fallback.
- Fixed camera, grip pivot near (0, -0.045, 0), quaternion poses with local barrel roll. 3.75s sequence: lift, broad-side hold, underside/magazine-up hold, return.
- Gun geometry is raycast for pointer interaction. No separate inspection button/control panel. Keyboard Enter/Space or Y works through the existing accessible button.
- Clicks during playback do not restart or stack. Drag takes the last rendered pose without catch-up, scrubs the same timeline, then resumes. Escape and pointer cancellation blend back in 230ms.
- Reduced motion disables playback; offscreen/hidden pages cancel animation and stop rendering. Idle does not run an animation loop.
- Embedded maps reduced from 2048px to 1024px: GLB 8,940,848 → 1,580,972 bytes. DPR limited to 1.5 on smaller canvases. Textures/shaders are prepared before the model becomes interactive.
- Page, runtime and GLB have content-derived cache versions.

## Boundaries

This is a newly authored web sequence guided by reference footage, not recovered game animation. The uploaded model contains neither hands nor animation clips, and its original material has no working emission map. The web shader derives a restrained violet mask and darkens/desaturates steel. Exact hand motion, upgraded skin particles and audio are not reproduced.

## Validation

- Static build: 23 scene anchors, 16 source entries, local resources and generated output checked.
- Unit tests: timeline continuity, exact idle/return endpoints, distinct side/underside poses.
- Blender actual-model pose studies: fixed-camera orientation/grip and desktop/mobile framing inspected separately.
- Browser execution and user-like interaction must be checked against the deployed commit. Local cloud-browser loopback is blocked (ERR_BLOCKED_BY_CLIENT); no alternate loopback route was attempted.
- Release/visual checks are recorded separately after publication; code review alone is not browser acceptance.

## Why the old version stayed 2D

The published baseline animated a PNG using CSS transforms; it could not reveal missing geometry. A later local attempt had not reached the remote main branch when the previous conversation stopped. The historical unpublished commits were not recovered by this update. A subsequent Windows asset-transfer attempt failed because the official helper used unsupported os.setxattr. This implementation starts from verified remote main and the verified cloud-local uploaded GLB.
