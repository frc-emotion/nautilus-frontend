# iOS App Store Submission Guide - Nautilus

## Quick Reference
- **Bundle ID:** `com.frcteam2658.nautilus`
- **Current Version:** `3.0.5`
- **Deployment Target:** iOS 15.1+
- **Changes Made:** Phone number field made optional (Apple compliance fix)

---

## Pre-Submission Checklist

### 1. Version Bump (If Needed)
If your previous submission was rejected and you're resubmitting the same version, you **don't need** to bump the version. If this is a new update:

```bash
# Edit app.json - increment version
# "version": "3.0.5" → "3.0.6"
```

### 2. Verify Code Changes Are Complete
- [x] Phone number made optional in RegisterScreen
- [x] Phone number made optional in UserDirectoryScreen  
- [x] Phone removed from "missing" flags in VerifyScreen
- [x] "N/A" displayed when phone is empty/placeholder
- [x] All files saved

---

## Step-by-Step Submission Process

### Phase 1: Build the iOS App

#### Option A: Using EAS Build (Recommended for Expo)

```bash
# Navigate to project
cd /Users/aaranchahal/nautilus-frontend

# Install EAS CLI if not installed
npm install -g eas-cli

# Login to Expo account
eas login

# Build for iOS (creates .ipa file)
eas build --platform ios --profile production

# This will:
# - Build in the cloud
# - Sign with your certificates
# - Produce an .ipa file
# - Optionally auto-submit to App Store Connect
```

#### Option B: Local Build with Xcode

```bash
# Navigate to project
cd /Users/aaranchahal/nautilus-frontend

# Install dependencies
yarn install

# Install iOS pods
cd ios && pod install && cd ..

# Open in Xcode
open ios/Nautilus.xcworkspace
```

### Phase 2: Archive in Xcode (If Building Locally)

1. **Open Xcode** with `ios/Nautilus.xcworkspace`

2. **Select Target Device**
   - In the top bar, select "Any iOS Device (arm64)" as the destination
   - NOT a simulator

3. **Check Signing**
   - Select the project in the navigator
   - Go to "Signing & Capabilities" tab
   - Ensure "Automatically manage signing" is checked
   - Select your Team (FRC Team 2658's Apple Developer account)
   - Bundle Identifier: `com.frcteam2658.nautilus`

4. **Set Build Configuration**
   - Product → Scheme → Edit Scheme
   - Set "Build Configuration" to "Release"

5. **Increment Build Number** (Required for each upload)
   - Select project → General tab
   - **Version:** Keep as `3.0.5` (or new version)
   - **Build:** Increment by 1 (e.g., 1 → 2, or check App Store Connect for last build number)

6. **Create Archive**
   - Menu: **Product → Archive**
   - Wait for build to complete (5-15 minutes)
   - Archives Organizer will open automatically

### Phase 3: Upload to App Store Connect

#### From Xcode Archives Organizer:

1. **Select your archive** in the Organizer window

2. **Click "Distribute App"**

3. **Select Distribution Method:**
   - Choose "App Store Connect"
   - Click "Next"

4. **Select Destination:**
   - Choose "Upload"
   - Click "Next"

5. **Distribution Options:**
   - ✅ Include bitcode (if available)
   - ✅ Upload your app's symbols
   - ✅ Manage Version and Build Number
   - Click "Next"

6. **Re-sign (if needed):**
   - Select "Automatically manage signing"
   - Click "Next"

7. **Review and Upload:**
   - Review the summary
   - Click "Upload"
   - Wait for upload to complete (5-20 minutes depending on connection)

8. **Processing:**
   - After upload, Apple processes the build (15-30 minutes)
   - You'll receive an email when processing completes

### Phase 4: Submit for Review in App Store Connect

1. **Go to App Store Connect**
   - https://appstoreconnect.apple.com

2. **Select Your App**
   - My Apps → Nautilus

3. **Prepare Submission**
   
   **If resubmitting rejected version:**
   - The draft version should still be there
   - Click on the version (e.g., "3.0.5 Prepare for Submission")
   
   **If new version:**
   - Click "+ Version or Platform" (top left)
   - Select "iOS"
   - Enter version number (e.g., 3.0.6)

4. **Select the Build**
   - Scroll to "Build" section
   - Click "+" or "Select a build"
   - Choose your newly uploaded build
   - Click "Done"

5. **Update What's New (Release Notes)**
   ```
   - Phone number is now optional during registration
   - Bug fixes and performance improvements
   ```

6. **Review App Information**
   - Verify all metadata is correct
   - Screenshots are in place
   - Description is accurate

7. **App Review Information**
   - Update any notes for reviewers if needed
   - Mention: "Phone number field has been made optional per previous review feedback"

8. **Submit for Review**
   - Click "Add for Review" (top right)
   - Review the submission summary
   - Click "Submit to App Review"

---

## Responding to Apple's Rejection

Since you're fixing a rejection, add this note in **App Review Information → Notes**:

```
This update addresses the previous rejection regarding phone number collection.

Changes made:
- Phone number field is now clearly marked as "Optional"
- Users can complete registration without providing a phone number
- The app no longer requires phone number as mandatory information

The phone number field remains available for users who wish to provide it, but it is not required.
```

---

## Timeline Expectations

| Stage | Duration |
|-------|----------|
| Build (EAS Cloud) | 10-30 minutes |
| Build (Local Xcode) | 5-15 minutes |
| Upload to App Store Connect | 5-20 minutes |
| Apple Processing | 15-30 minutes |
| App Review | 24-48 hours (typically) |

---

## Common Issues & Solutions

### Issue: "No accounts with App Store Connect access"
**Solution:** Ensure you're signed into Xcode with the Apple Developer account that owns the app.

### Issue: "Invalid Binary"
**Solution:** 
- Check that deployment target matches your certificates
- Ensure all required icons are present
- Verify Info.plist has all required keys

### Issue: Build number already exists
**Solution:** Increment the build number in Xcode (General → Build)

### Issue: Archive option is greyed out
**Solution:** Select "Any iOS Device" as the build destination, not a simulator

### Issue: "Missing Compliance" warning
**Solution:** Your app.json already has `ITSAppUsesNonExemptEncryption: false`, which should handle this automatically.

---

## Quick Commands Reference

```bash
# Full rebuild and submit via EAS (easiest method)
cd /Users/aaranchahal/nautilus-frontend
eas build --platform ios --profile production --auto-submit

# Or just build, then manually submit
eas build --platform ios --profile production

# Check build status
eas build:list

# View build logs
eas build:view
```

---

## After Approval

Once approved:
1. You'll receive an email from Apple
2. If set to "Manual Release": Go to App Store Connect → Release This Version
3. If set to "Automatic Release": App goes live immediately after approval
4. Monitor for any user feedback or issues

---

## Files Modified for This Update

| File | Change |
|------|--------|
| `src/screens/Auth/RegisterScreen.tsx` | Phone optional, "(Optional)" label |
| `src/screens/User/UserDirectoryScreen.tsx` | Phone optional in edit form |
| `src/screens/User/ProfileScreen.tsx` | Display "N/A" for empty phone |
| `src/screens/Admin/VerifyScreen.tsx` | Removed phone from missing flags |

---

## Support

- Apple Developer Support: https://developer.apple.com/contact/
- App Store Connect Help: https://developer.apple.com/help/app-store-connect/
- Expo EAS Documentation: https://docs.expo.dev/build/introduction/

---

*Last Updated: January 24, 2026*
