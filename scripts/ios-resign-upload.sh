#!/bin/sh
# Re-sign the unsigned CI-built Nautilus.app with the App Store distribution
# certificate and the "Yurr" App Store profile, wrap it in an .xcarchive, and
# upload to App Store Connect via the Apple ID signed into Xcode.
set -e
S="${TMPDIR:-/tmp}/nautilus-ios-release"; mkdir -p "$S"
ZIP="${1:?usage: ios-resign-upload.sh <Nautilus-unsigned.zip from the GitHub Actions artifact>}"
WORK="$S/resign"
IDENTITY="2BEC41E41C86FB9F4D99B2D91ABF7CB53488557E"
PROFILE_NAME="Yurr"

rm -rf "$WORK"; mkdir -p "$WORK"
cd "$WORK"
unzip -q "$ZIP"
APP="$WORK/Nautilus.app"
[ -d "$APP" ] || { echo "Nautilus.app not found in artifact"; exit 1; }

echo "== built with:"; plutil -p "$APP/Info.plist" | grep -E "DTSDKName|DTXcode\"|CFBundleShortVersionString|CFBundleVersion"

# Locate the App Store profile by name
PROFILE=""
for f in "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles"/*.mobileprovision; do
  n=$(security cms -D -i "$f" 2>/dev/null | plutil -extract Name raw - 2>/dev/null || true)
  [ "$n" = "$PROFILE_NAME" ] && PROFILE="$f"
done
[ -n "$PROFILE" ] || { echo "profile $PROFILE_NAME not found"; exit 1; }
echo "== profile: $PROFILE"

# Entitlements come from the profile
security cms -D -i "$PROFILE" > "$WORK/profile.plist"
plutil -extract Entitlements xml1 -o "$WORK/entitlements.plist" "$WORK/profile.plist"
# Strip keys App Store builds must not carry unless enabled (keep it minimal)
/usr/libexec/PlistBuddy -c "Print" "$WORK/entitlements.plist" | head -20

cp "$PROFILE" "$APP/embedded.mobileprovision"

# Sign nested frameworks and dylibs first, then the app
find "$APP/Frameworks" -maxdepth 1 \( -name "*.framework" -o -name "*.dylib" \) 2>/dev/null | while read -r fw; do
  codesign --force --sign "$IDENTITY" --timestamp=none "$fw"
done
codesign --force --sign "$IDENTITY" --entitlements "$WORK/entitlements.plist" --timestamp=none "$APP"
codesign --verify --deep --strict --verbose=2 "$APP" && echo "== codesign verify: OK"
codesign -dvv "$APP" 2>&1 | grep -E "Authority=Apple Distribution" || true

VER=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$APP/Info.plist")
BUILD=$(/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" "$APP/Info.plist")
DAY=$(date +%Y-%m-%d)
ARCH="$HOME/Library/Developer/Xcode/Archives/$DAY/Nautilus $VER ($BUILD) ci.xcarchive"
rm -rf "$ARCH"; mkdir -p "$ARCH/Products/Applications"
cp -R "$APP" "$ARCH/Products/Applications/"
if [ -d "$WORK/Nautilus.app.dSYM" ]; then mkdir -p "$ARCH/dSYMs"; cp -R "$WORK/Nautilus.app.dSYM" "$ARCH/dSYMs/"; fi
cat > "$ARCH/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>ApplicationProperties</key>
	<dict>
		<key>ApplicationPath</key><string>Applications/Nautilus.app</string>
		<key>Architectures</key><array><string>arm64</string></array>
		<key>CFBundleIdentifier</key><string>com.frcteam2658.nautilus</string>
		<key>CFBundleShortVersionString</key><string>$VER</string>
		<key>CFBundleVersion</key><string>$BUILD</string>
		<key>SigningIdentity</key><string>$IDENTITY</string>
		<key>Team</key><string>V45T9ZDS6N</string>
	</dict>
	<key>ArchiveVersion</key><integer>2</integer>
	<key>CreationDate</key><date>$(date -u +%Y-%m-%dT%H:%M:%SZ)</date>
	<key>Name</key><string>Nautilus</string>
	<key>SchemeName</key><string>Nautilus</string>
</dict>
</plist>
EOF
echo "== archive: $ARCH"
echo "== export + upload"
rm -rf "$S/export"
xcodebuild -exportArchive -archivePath "$ARCH" -exportOptionsPlist "$(dirname "$0")/exportOptions.plist" -exportPath "$S/export" -allowProvisioningUpdates 2>&1 | grep -vE "^\s*$" | tail -20
