# Android Release Guide: Publishing to New Google Play Account

> **Created:** January 2026  
> **App:** Nautilus (com.frc2658.nautilus → YOUR_NEW_PACKAGE)  
> **Context:** Migrating from another developer's account with different package/signing

---

## Table of Contents
1. [Pre-Flight Checklist](#1-pre-flight-checklist)
2. [Choose Your New Package Name](#2-choose-your-new-package-name)
3. [Generate Release Keystore](#3-generate-release-keystore)
4. [Configure Secure Signing](#4-configure-secure-signing)
5. [Update Package Name Everywhere](#5-update-package-name-everywhere)
6. [Build & Test](#6-build--test)
7. [Google Play Console Setup](#7-google-play-console-setup)
8. [Troubleshooting](#8-troubleshooting)
9. [Security & Backup](#9-security--backup)
10. [Master Checklist](#10-master-checklist)

---

## 1. Pre-Flight Checklist

### Before You Start
- [ ] Google Play Developer Account created ($25 one-time fee)
- [ ] Java/JDK installed (check: `java -version`)
- [ ] Android SDK installed with build-tools
- [ ] Physical Android device or emulator for testing
- [ ] Backup of current android/ directory (optional but recommended)

### Verify Java keytool is available
```bash
keytool -help
```
If not found, install JDK or locate it in Android Studio's embedded JDK.

---

## 2. Choose Your New Package Name

### Package Name Rules
- Must be unique on Google Play (no other app can have it)
- Format: `com.yourcompany.appname` (reverse domain notation)
- Allowed: lowercase letters, numbers, underscores, dots
- Cannot start with a number
- Cannot be changed after first upload to Play Store

### Suggested Options for Nautilus
```
com.yourname.nautilus
com.yourdomain.nautilus
org.frcteam2658.nautilus
```

### ⚠️ Important Notes
- This is **DIFFERENT** from the old app - it will appear as a completely new app
- Users of the old app will NOT get automatic updates
- Choose wisely - this is permanent!

**YOUR CHOSEN PACKAGE NAME:** `org.frcteam2658.nautilus`
(Write this down - you'll use it in all following steps)

---

## 3. Generate Release Keystore

### Understanding the Parameters
| Parameter | Description | Recommendation |
|-----------|-------------|----------------|
| `-genkeypair` | Generate a key pair | Required |
| `-v` | Verbose output | Helpful |
| `-storetype JKS` | Java KeyStore format | Required for older build tools |
| `-keyalg RSA` | Key algorithm | RSA is standard |
| `-keysize 2048` | Key size in bits | 2048 minimum, 4096 recommended |
| `-validity 10000` | Days until expiration | ~27 years |
| `-alias` | Name to identify the key | Use something memorable |
| `-keystore` | Output file path | Store securely! |

### Step 3.1: Create Keystore Directory
```bash
cd /Users/aaranchahal/nautilus-frontend
mkdir -p android/app/keystore
```

### Step 3.2: Generate the Keystore
```bash
keytool -genkeypair -v \
  -storetype JKS \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000 \
  -alias nautilus-release-key \
  -keystore android/app/keystore/nautilus-release.keystore
```

### Step 3.3: Answer the Prompts
You'll be asked for:
1. **Keystore password:** Create a strong password (SAVE THIS!)
2. **Key password:** Can be same as keystore password
3. **First and Last Name:** Your name or organization
4. **Organizational Unit:** Team or department (e.g., "Development")
5. **Organization:** Company/team name (e.g., "FRC Team 2658")
6. **City/Locality:** Your city
7. **State/Province:** Your state
8. **Country Code:** Two-letter code (e.g., "US")

### Step 3.4: Verify Keystore was Created
```bash
keytool -list -v -keystore android/app/keystore/nautilus-release.keystore
```
Enter your password when prompted. You should see certificate details.

### ⚠️ CRITICAL: SAVE THESE CREDENTIALS
```
Keystore file: android/app/keystore/nautilus-release.keystore
Keystore password: ___________________________
Key alias: nautilus-release-key
Key password: ___________________________
```
**Store these in a password manager immediately! If lost, you cannot update your app.**

---

## 4. Configure Secure Signing

### Step 4.1: Create keystore.properties File
Create a new file `android/keystore.properties`:

```properties
# Release keystore configuration
# ⚠️ DO NOT COMMIT THIS FILE TO VERSION CONTROL

storeFile=keystore/nautilus-release.keystore
storePassword=YOUR_KEYSTORE_PASSWORD_HERE
keyAlias=nautilus-release-key
keyPassword=YOUR_KEY_PASSWORD_HERE
```

**Replace the passwords with your actual passwords!**

### Step 4.2: Update .gitignore
Add these lines to your `.gitignore`:

```gitignore
# Android release signing
android/keystore.properties
android/app/keystore/
*.keystore
*.jks
```

### Step 4.3: Update build.gradle Signing Config

Edit `android/app/build.gradle`. Find the `android { }` block and modify it:

**BEFORE (current - using debug for release):**
```gradle
android {
    ndkVersion rootProject.ext.ndkVersion
    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace 'com.frc2658.nautilus'
    defaultConfig {
        applicationId 'com.frc2658.nautilus'
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "3.0.5"
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.debug  // ← WRONG! Using debug for release
            ...
        }
    }
```

**AFTER (correct - secure release signing):**
```gradle
// Add this at the TOP of the file, before `apply plugin:`
def keystorePropertiesFile = rootProject.file("keystore.properties")
def keystoreProperties = new Properties()
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}

// ... existing code ...

android {
    ndkVersion rootProject.ext.ndkVersion
    buildToolsVersion rootProject.ext.buildToolsVersion
    compileSdk rootProject.ext.compileSdkVersion

    namespace 'YOUR_NEW_PACKAGE_NAME'  // ← CHANGE THIS
    defaultConfig {
        applicationId 'YOUR_NEW_PACKAGE_NAME'  // ← CHANGE THIS
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "3.0.5"
    }
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            signingConfig signingConfigs.release  // ← NOW USING RELEASE CONFIG
            shrinkResources (findProperty('android.enableShrinkResourcesInReleaseBuilds')?.toBoolean() ?: false)
            minifyEnabled enableProguardInReleaseBuilds
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
            crunchPngs (findProperty('android.enablePngCrunchInReleaseBuilds')?.toBoolean() ?: true)
        }
    }
```

---

## 5. Update Package Name Everywhere

Replace `YOUR_NEW_PACKAGE_NAME` with your chosen package (e.g., `com.yourname.nautilus`).

### Step 5.1: Update app.json
Edit `/Users/aaranchahal/nautilus-frontend/app.json`:

**Change line 30:**
```json
"android": {
  "package": "YOUR_NEW_PACKAGE_NAME",
```

### Step 5.2: Update build.gradle
Already covered in Step 4.3 - change both `namespace` and `applicationId`.

### Step 5.3: Update AndroidManifest.xml
Edit `android/app/src/main/AndroidManifest.xml`:

**Find and replace the scheme reference:**
```xml
<!-- BEFORE -->
<data android:scheme="com.frc2658.nautilus"/>

<!-- AFTER -->
<data android:scheme="YOUR_NEW_PACKAGE_NAME"/>
```

### Step 5.4: Rename Java/Kotlin Package Directory

This requires creating a new directory structure and moving files:

```bash
cd /Users/aaranchahal/nautilus-frontend

# Create new package directory structure
# Example for com.yourname.nautilus:
mkdir -p android/app/src/main/java/com/yourname/nautilus

# Move the Kotlin files
mv android/app/src/main/java/com/frc2658/nautilus/MainActivity.kt \
   android/app/src/main/java/com/yourname/nautilus/

mv android/app/src/main/java/com/frc2658/nautilus/MainApplication.kt \
   android/app/src/main/java/com/yourname/nautilus/

# Remove old directory structure
rm -rf android/app/src/main/java/com/frc2658
```

### Step 5.5: Update Package Declaration in Kotlin Files

**MainActivity.kt - Change first line:**
```kotlin
// BEFORE
package com.frc2658.nautilus

// AFTER
package com.yourname.nautilus
```

**MainApplication.kt - Change first line:**
```kotlin
// BEFORE
package com.frc2658.nautilus

// AFTER
package com.yourname.nautilus
```

### Step 5.6: Verification - Check All References
```bash
cd /Users/aaranchahal/nautilus-frontend

# This should return EMPTY if all old references are removed:
grep -r "com.frc2658" android/ --include="*.xml" --include="*.kt" --include="*.java" --include="*.gradle"

# This should show your new package in all the right places:
grep -r "YOUR_NEW_PACKAGE_NAME" android/ --include="*.xml" --include="*.kt" --include="*.java" --include="*.gradle"
```

---

## 6. Build & Test

### Step 6.1: Clean Previous Builds
```bash
cd /Users/aaranchahal/nautilus-frontend/android
./gradlew clean
```

### Step 6.2: Build Debug APK First (Quick Verification)
```bash
./gradlew assembleDebug
```
**Output location:** `android/app/build/outputs/apk/debug/app-debug.apk`

### Step 6.3: Build Release APK (For Testing)
```bash
./gradlew assembleRelease
```
**Output location:** `android/app/build/outputs/apk/release/app-release.apk`

### Step 6.4: Build Release AAB (For Play Store)
```bash
./gradlew bundleRelease
```
**Output location:** `android/app/build/outputs/bundle/release/app-release.aab`

### Step 6.5: Verify the Built APK/AAB

**Check package name:**
```bash
# For APK
aapt dump badging android/app/build/outputs/apk/release/app-release.apk | grep package

# For AAB (requires bundletool)
# Download from: https://github.com/google/bundletool/releases
java -jar bundletool.jar dump manifest --bundle=android/app/build/outputs/bundle/release/app-release.aab | grep package
```

**Verify signing:**
```bash
# Check APK signature
apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk

# Or using jarsigner
jarsigner -verify -verbose -certs android/app/build/outputs/apk/release/app-release.apk
```

**Get signing certificate fingerprint (needed for some APIs):**
```bash
keytool -list -v -keystore android/app/keystore/nautilus-release.keystore | grep SHA256
```

### Step 6.6: Install and Test on Device
```bash
# Connect device via USB with USB debugging enabled
adb install android/app/build/outputs/apk/release/app-release.apk

# Or install over existing debug version
adb install -r android/app/build/outputs/apk/release/app-release.apk
```

**Manual Testing Checklist:**
- [ ] App installs successfully
- [ ] App launches without crash
- [ ] All core features work
- [ ] Bluetooth/beacon functionality works
- [ ] Deep links work (nautilus:// scheme)
- [ ] No debug banners or warnings

---

## 7. Google Play Console Setup

### Step 7.1: Create New App in Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. Fill in app details:
   - **App name:** Nautilus
   - **Default language:** English (US)
   - **App or game:** App
   - **Free or paid:** Free (or Paid)
4. Accept declarations and create

### Step 7.2: ⚠️ New Account Requirements (Post-November 2023)

If your Google Play Developer account was created after November 13, 2023:

**14-Day Closed Testing Requirement:**
- Must run closed testing for **at least 14 consecutive days**
- Must have **at least 12 testers** who have opted in
- Testers must have **actually used the app** (not just opted in)
- After 14 days, you can apply for production access

**How to Set Up Closed Testing:**
1. Go to "Testing" → "Closed testing"
2. Create a new track
3. Add tester emails (need 12 minimum)
4. Upload your AAB file
5. Roll out to testers
6. Wait 14 days with active testing

### Step 7.3: Required Store Listing Assets

| Asset | Specifications |
|-------|---------------|
| **App icon** | 512x512 PNG, 32-bit, no alpha |
| **Feature graphic** | 1024x500 PNG or JPG |
| **Phone screenshots** | 2-8 images, 16:9 or 9:16, min 320px, max 3840px |
| **Tablet screenshots** | Optional but recommended |
| **Short description** | Max 80 characters |
| **Full description** | Max 4000 characters |

### Step 7.4: Content Rating Questionnaire
1. Go to "Policy" → "App content"
2. Complete the content rating questionnaire
3. Answer honestly about app content
4. Receive ratings for different regions

### Step 7.5: Data Safety Form
1. Go to "Policy" → "App content" → "Data safety"
2. Declare all data your app collects:
   - Location data (you have location permissions)
   - Device identifiers
   - Any analytics/crash reporting (Sentry)
3. Explain data usage and sharing

### Step 7.6: Target Audience and Content
1. Declare target age group
2. If app is for children, additional requirements apply
3. FRC/robotics app likely targets 13+

### Step 7.7: App Category and Contact
1. Select appropriate category (probably "Education" or "Tools")
2. Add developer contact email
3. Add privacy policy URL (required)
4. Add website (optional)

### Step 7.8: Upload AAB and Submit
1. Go to "Production" (or "Closed testing" for new accounts)
2. Create new release
3. Upload `app-release.aab`
4. Add release notes
5. Review and roll out

---

## 8. Troubleshooting

### Build Errors

**Error: "Keystore was tampered with, or password was incorrect"**
```
Solution: Double-check password in keystore.properties. No quotes needed.
```

**Error: "Could not find keystore file"**
```
Solution: Verify path in keystore.properties is relative to android/ directory.
The storeFile path should be: keystore/nautilus-release.keystore
```

**Error: "Execution failed for task ':app:processReleaseResources'"**
```
Solution: Clean and rebuild:
cd android && ./gradlew clean && ./gradlew bundleRelease
```

**Error: "Cannot resolve symbol 'R'" or package-related errors**
```
Solution: Ensure package name matches in:
1. build.gradle namespace and applicationId
2. Directory structure (java/com/your/package/)
3. Package declarations in .kt files
```

**Error: "Duplicate class" or merge conflicts**
```
Solution:
cd android && ./gradlew clean
rm -rf android/.gradle
rm -rf android/app/build
./gradlew bundleRelease
```

### Signing Errors

**Error: "APK signature verification failed"**
```
Solution: Verify release signingConfig is correctly configured and keystore.properties exists.
```

**Error: "The apk must be signed with the same certificates"**
```
This happens when trying to update an app with different signing key.
Since you're publishing as NEW app, this shouldn't occur.
If it does, you're accidentally using old package name.
```

### Play Store Errors

**Error: "You uploaded an APK that is signed with a different certificate"**
```
This means package name conflicts with existing app.
Solution: Choose a completely different package name.
```

**Error: "Version code already used"**
```
Solution: Increment versionCode in build.gradle defaultConfig.
```

### Rollback Procedure

If something goes wrong:
```bash
# If you haven't deleted old files yet, they're still there

# If you need to regenerate android/ directory:
cd /Users/aaranchahal/nautilus-frontend
rm -rf android/
npx expo prebuild --platform android

# Then reapply all the changes from this guide
```

---

## 9. Security & Backup

### Keystore Backup Strategy

**⚠️ CRITICAL: If you lose your keystore, you CANNOT update your app. Ever.**

**Immediate Actions:**
1. Copy keystore to multiple secure locations:
   ```bash
   cp android/app/keystore/nautilus-release.keystore ~/Desktop/BACKUP_nautilus-release.keystore
   ```

2. Store in password manager (1Password, Bitwarden, etc.) - you can attach files

3. Store in secure cloud storage (with encryption):
   - Google Drive (encrypted ZIP)
   - AWS S3 (encrypted)
   - Dedicated secrets manager

4. Create physical backup on USB drive, store in safe location

**What to Backup:**
- `nautilus-release.keystore` file
- Keystore password
- Key alias
- Key password
- This guide document

### Team Workflow Best Practices

**For Team Development:**

1. **Never commit keystore or passwords to git**

2. **CI/CD Setup (GitHub Actions, etc.):**
   - Store keystore as base64 secret: 
     ```bash
     base64 -i android/app/keystore/nautilus-release.keystore | pbcopy
     ```
   - Add as GitHub Secret: `ANDROID_KEYSTORE_BASE64`
   - Add passwords as separate secrets

3. **Environment Variables for CI:**
   ```yaml
   - name: Decode Keystore
     run: |
       echo $ANDROID_KEYSTORE_BASE64 | base64 -d > android/app/keystore/nautilus-release.keystore
       echo "storeFile=keystore/nautilus-release.keystore" > android/keystore.properties
       echo "storePassword=$KEYSTORE_PASSWORD" >> android/keystore.properties
       echo "keyAlias=nautilus-release-key" >> android/keystore.properties
       echo "keyPassword=$KEY_PASSWORD" >> android/keystore.properties
   ```

4. **Access Control:**
   - Limit keystore access to release managers
   - Use separate signing for debug builds
   - Consider Google Play App Signing (they hold the key)

### Google Play App Signing (Recommended)

Google offers to manage your app signing key:
1. You upload an "upload key" (your keystore)
2. Google signs the final APK with their key
3. If you lose your upload key, you can reset it
4. **Strongly recommended for new apps**

Enable during first upload in Play Console.

---

## 10. Master Checklist

### Phase 1: Preparation (~15 minutes) ✅ REVERSIBLE

- [ ] 1.1 Backup current android/ directory (optional)
  ```bash
  cp -r android android_backup
  ```
- [ ] 1.2 Choose new package name: `________________________`
- [ ] 1.3 Verify Java/keytool available: `keytool -help`
- [ ] 1.4 Create keystore directory
  ```bash
  mkdir -p android/app/keystore
  ```

### Phase 2: Generate Keystore (~5 minutes) ⚠️ IRREVERSIBLE

- [ ] 2.1 Generate keystore file
  ```bash
  keytool -genkeypair -v -storetype JKS -keyalg RSA -keysize 4096 \
    -validity 10000 -alias nautilus-release-key \
    -keystore android/app/keystore/nautilus-release.keystore
  ```
- [ ] 2.2 **SAVE PASSWORDS IMMEDIATELY** in password manager
- [ ] 2.3 Verify keystore created
  ```bash
  keytool -list -v -keystore android/app/keystore/nautilus-release.keystore
  ```
- [ ] 2.4 **BACKUP KEYSTORE** to secure location

### Phase 3: Configure Signing (~10 minutes) ✅ REVERSIBLE

- [ ] 3.1 Create `android/keystore.properties` with credentials
- [ ] 3.2 Update `.gitignore` with keystore entries
- [ ] 3.3 Verify keystore.properties not tracked
  ```bash
  git status
  ```

### Phase 4: Update Package Name (~15 minutes) ✅ REVERSIBLE

- [ ] 4.1 Update `app.json` android.package
- [ ] 4.2 Update `android/app/build.gradle`:
  - [ ] Add keystoreProperties loading at top
  - [ ] Change namespace
  - [ ] Change applicationId
  - [ ] Add release signingConfig
  - [ ] Update buildTypes.release to use signingConfigs.release
- [ ] 4.3 Update `android/app/src/main/AndroidManifest.xml` scheme
- [ ] 4.4 Create new package directory structure
- [ ] 4.5 Move MainActivity.kt and MainApplication.kt
- [ ] 4.6 Update package declaration in both .kt files
- [ ] 4.7 Remove old directory structure
- [ ] 4.8 **VERIFY:** No old package references remain
  ```bash
  grep -r "com.frc2658" android/
  # Should return empty!
  ```

### Phase 5: Build & Test (~20 minutes) ✅ REVERSIBLE

- [ ] 5.1 Clean build
  ```bash
  cd android && ./gradlew clean
  ```
- [ ] 5.2 Build debug APK
  ```bash
  ./gradlew assembleDebug
  ```
- [ ] 5.3 Build release APK
  ```bash
  ./gradlew assembleRelease
  ```
- [ ] 5.4 Verify package name in APK
  ```bash
  aapt dump badging app/build/outputs/apk/release/app-release.apk | grep package
  ```
- [ ] 5.5 Verify signing
  ```bash
  apksigner verify --verbose app/build/outputs/apk/release/app-release.apk
  ```
- [ ] 5.6 Install on test device
  ```bash
  adb install app/build/outputs/apk/release/app-release.apk
  ```
- [ ] 5.7 **Manual testing** - all features work
- [ ] 5.8 Build release AAB for Play Store
  ```bash
  ./gradlew bundleRelease
  ```

### Phase 6: Play Store Upload (~30 minutes + 14 days for new accounts) ⚠️ IRREVERSIBLE

- [ ] 6.1 Create app in Google Play Console
- [ ] 6.2 Complete store listing (icon, screenshots, descriptions)
- [ ] 6.3 Complete content rating questionnaire
- [ ] 6.4 Complete data safety form
- [ ] 6.5 Set up closed testing (if new account - need 12 testers)
- [ ] 6.6 Upload AAB
- [ ] 6.7 Roll out to testing track
- [ ] 6.8 Wait 14 days (new accounts only)
- [ ] 6.9 Apply for production access
- [ ] 6.10 Submit for review

### Phase 7: Post-Launch (~10 minutes)

- [ ] 7.1 Verify app appears in Play Store search
- [ ] 7.2 Test installing from Play Store on fresh device
- [ ] 7.3 Monitor crash reports in Play Console
- [ ] 7.4 Set up release management workflow for future updates

---

## Quick Reference Commands

```bash
# Navigate to project
cd /Users/aaranchahal/nautilus-frontend

# Clean build
cd android && ./gradlew clean && cd ..

# Build debug APK
cd android && ./gradlew assembleDebug

# Build release APK
cd android && ./gradlew assembleRelease

# Build release AAB (for Play Store)
cd android && ./gradlew bundleRelease

# Check APK info
aapt dump badging android/app/build/outputs/apk/release/app-release.apk | grep -E "package|version"

# Verify APK signature
apksigner verify --verbose android/app/build/outputs/apk/release/app-release.apk

# Install on device
adb install -r android/app/build/outputs/apk/release/app-release.apk

# View keystore info
keytool -list -v -keystore android/app/keystore/nautilus-release.keystore

# Get SHA-256 fingerprint (for APIs like Google Sign-In)
keytool -list -v -keystore android/app/keystore/nautilus-release.keystore | grep SHA256
```

---

## Files Modified Summary

| File | Changes |
|------|---------|
| `app.json` | android.package |
| `android/app/build.gradle` | namespace, applicationId, signing config |
| `android/app/src/main/AndroidManifest.xml` | scheme in intent-filter |
| `android/app/src/main/java/NEW/PACKAGE/PATH/MainActivity.kt` | package declaration, file location |
| `android/app/src/main/java/NEW/PACKAGE/PATH/MainApplication.kt` | package declaration, file location |
| `android/keystore.properties` | NEW FILE - credentials |
| `.gitignore` | Added keystore entries |

---

**Total Estimated Time:**
- Phase 1-5 (local work): ~65 minutes
- Phase 6 (Play Store): ~30 minutes + 14 days waiting (new accounts)
- Phase 7 (post-launch): ~10 minutes

**Document Version:** 1.0  
**Last Updated:** January 2026
