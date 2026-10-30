# Leaf desktop

An Electron shell around the hosted Leaf app (same library, same books in
local storage per machine).

```bash
cd desktop
npm install
npm run start        # dev window
npm run build:mac    # dist/Leaf-1.0.0-arm64.dmg
npm run build:win    # NSIS installer (build on Windows)
npm run build:linux  # AppImage
```

Point it at another deployment with `LEAF_URL=https://… npm run start`.

Builds are unsigned, so macOS shows “unidentified developer” the first time:
right-click the app → **Open**, or `xattr -dr com.apple.quarantine /Applications/Leaf.app`.
