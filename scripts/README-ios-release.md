# iOS App Store release (Xcode 26 via GitHub Actions)

Apple requires uploads built with the iOS 26 SDK. This Mac cannot run Xcode 26,
so the compile happens on a GitHub macOS runner and signing happens locally.

1. Bump the version: `app.json` (`expo.version`) and `ios/Nautilus/Info.plist`
   (`CFBundleShortVersionString`, `CFBundleVersion`). Apple rejects duplicates.
2. Merge main into this branch: `git checkout ios-releases && git merge main && git push`
3. Trigger the build: `gh workflow run ios-build.yml --ref ios-releases -R frc-emotion/nautilus-frontend`
   (or Actions tab, "iOS unsigned build (Xcode 26)", Run workflow, branch ios-releases).
4. When green: `gh run download <run-id> -n Nautilus-unsigned -R frc-emotion/nautilus-frontend`
5. Sign and upload from a Mac that has the Apple Distribution certificate, the
   "Yurr" App Store profile, and an Apple ID signed into Xcode:
   `scripts/ios-resign-upload.sh Nautilus-unsigned.zip`
6. In App Store Connect, wait for processing, then attach the build to the
   version and submit (or TestFlight).

Notes: the Podfile patches fmt for Xcode 26 clang; sentry source-map upload is
disabled in CI (no token). Android is unaffected: build the APK locally with
Gradle and publish it as a GitHub release.
