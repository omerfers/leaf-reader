# Leaf for iOS and Android

A thin Expo wrapper that opens the Leaf web app in a full-screen WebView, so it
installs and launches like a native app.

```bash
cd mobile
npm install
npx expo start          # scan the QR with Expo Go
```

Build a standalone binary with EAS:

```bash
npx eas build -p ios
npx eas build -p android
```

The wrapper has no library of its own: books live in the WebView's storage on
the device, exactly like the website. Point it at another deployment with
`EXPO_PUBLIC_LEAF_URL=https://… npx expo start`.

Icons and splash come from `assets/`, generated from `app/icon.svg`.
