# HomeFlow

A React Native mobile application for family household task management, built with Expo SDK 54.

## Overview

HomeFlow helps families organize and manage household tasks with a reward system that encourages participation from all family members. The app supports both parent and child modes with appropriate permissions and features for each role.

## Technology Stack

- **Expo SDK**: 54.0.0
- **React Native**: 0.81.5
- **React**: 19.1.0
- **Node.js**: 20.19.6 (minimum 20.19.4)
- **npm**: 10.8.2

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 20.19.4 or higher (Version 20.19.6 recommended)
- **npm**: Comes with Node.js (Version 10.8.2 or higher)
- **Expo CLI**: Install globally with `npm install -g @expo/cli`
- **Expo Go**: Mobile app for testing (SDK 54 compatible)

### Platform-Specific Requirements

#### iOS Development (macOS only)
- **Xcode**: Latest version from Mac App Store
- **iOS Simulator**: Included with Xcode
- **macOS**: Required for iOS simulator testing

#### Android Development (All platforms)
- **Android Studio**: Download from developer.android.com
- **Android SDK**: Included with Android Studio
- **Android Emulator**: Set up through Android Studio AVD Manager

## Installation

1. **Clone or navigate to the project directory:**
   ```bash
   cd HomeFlow
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Verify installation:**
   ```bash
   npm run lint
   ```

## Development Workflow

### Starting the Development Server

1. **Launch Metro bundler:**
   ```bash
   npm start
   ```

2. **Choose your testing platform:**
   - Press `i` for iOS Simulator (macOS only)
   - Press `a` for Android Emulator
   - Press `w` for Web Browser
   - Scan QR code with Expo Go app on mobile device

### Available Scripts

- `npm start` - Start Metro bundler with platform selection
- `npm run ios` - Start and open iOS simulator directly
- `npm run android` - Start and open Android emulator directly
- `npm run web` - Start and open web browser directly
- `npm run lint` - Run ESLint code quality checks
- `npm run lint:fix` - Run ESLint with automatic fixes

### Code Quality

Before committing changes:

1. **Run linting:**
   ```bash
   npm run lint
   ```

2. **Fix linting issues:**
   ```bash
   npm run lint:fix
   ```

## Platform Testing Procedures

### Testing on iOS Simulator (macOS)

1. **Prerequisites:**
   - Xcode installed and updated
   - iOS Simulator available

2. **Testing steps:**
   ```bash
   npm start
   # Press 'i' or use: npm run ios
   ```

3. **Verification:**
   - Welcome screen displays "HomeFlow" title
   - Current date/time shows and updates
   - No console errors in Metro bundler

### Testing on Android Emulator

1. **Prerequisites:**
   - Android Studio installed
   - Android Virtual Device (AVD) created and running

2. **Testing steps:**
   ```bash
   npm start
   # Press 'a' or use: npm run android
   ```

3. **Verification:**
   - Welcome screen displays correctly
   - Touch interactions work properly
   - No build errors in Metro bundler

### Testing on Physical Devices

1. **Install Expo Go:**
   - iOS: Download from App Store
   - Android: Download from Google Play Store

2. **Connect to development server:**
   - Ensure device and computer are on same WiFi network
   - Run `npm start`
   - Scan QR code with Expo Go app

3. **Verification:**
   - App loads without errors
   - Real-time updates work when code changes
   - Performance is acceptable on target devices

### Testing in Web Browser

1. **Launch web version:**
   ```bash
   npm start
   # Press 'w' or use: npm run web
   ```

2. **Verification:**
   - App renders in browser
   - Basic functionality works
   - Responsive design adapts to browser window

## Troubleshooting

### Common Issues and Solutions

#### Metro Bundler Issues

**Problem:** Metro bundler fails to start or shows cache errors
```bash
# Clear Metro cache
npm start -- --clear-cache
# or
expo start -c
```

**Problem:** "Unable to resolve module" errors
```bash
# Clear node modules and reinstall
rm -rf node_modules
npm install
```

#### Node.js Version Issues

**Problem:** npm start fails with Node.js version errors
```bash
# Check Node.js version
node --version

# Requires Node.js 20.19.4 or higher for Expo SDK 54
# Use nvm to upgrade if needed:
nvm install 20
nvm use 20
```

#### iOS Simulator Issues

**Problem:** iOS Simulator not opening or app not loading
- Verify Xcode is installed and updated
- Reset iOS Simulator: Device → Erase All Content and Settings
- Restart Xcode and try again

**Problem:** "No devices available" error
- Open Xcode → Window → Devices and Simulators
- Create a new iOS simulator if none exist

#### Android Emulator Issues

**Problem:** Android emulator not starting
- Open Android Studio → AVD Manager
- Verify virtual device is created and can start
- Check that Android SDK is properly installed

**Problem:** "SDK location not found" error
- Set ANDROID_HOME environment variable
- Point to Android SDK installation directory

#### Network and Device Connection Issues

**Problem:** Mobile device cannot connect via Expo Go
- Verify device and computer are on same WiFi network
- Disable VPN if active
- Try connecting via tunnel: `expo start --tunnel`

**Problem:** QR code not scanning
- Ensure good lighting when scanning
- Try typing the URL manually in Expo Go
- Use tunnel mode if local network has restrictions

#### Linting Issues

**Problem:** ESLint errors preventing development
```bash
# View specific errors
npm run lint

# Auto-fix common issues
npm run lint:fix

# Temporarily disable for development (not recommended)
# Add // eslint-disable-next-line to problem lines
```

### Getting Help

If you encounter issues not covered here:

1. **Check Metro bundler output** for specific error messages
2. **Clear caches** and restart development server
3. **Verify prerequisites** are properly installed
4. **Check Expo documentation** at docs.expo.dev
5. **Review React Native troubleshooting** at reactnative.dev

### Performance Optimization

For better development experience:

- **Use physical devices** for performance testing
- **Close unnecessary applications** while running simulators
- **Use web browser** for quick UI iterations
- **Clear Metro cache** if builds become slow

## Project Structure

```
HomeFlow/
├── App.js                 # Root component
├── app.json              # Expo configuration
├── package.json          # Dependencies and scripts
├── .eslintrc.json        # Code quality rules
└── src/                  # Application source code
    ├── components/       # Reusable components
    ├── screens/          # Screen components
    ├── styles/          # Shared styling
    └── utils/           # Utility functions
```

## Next Steps

This project setup provides the foundation for HomeFlow development. Future development phases will add:

- Family management system
- Task creation and assignment
- Reward and points system
- Offline synchronization
- Statistics and reporting

For implementation details, refer to the specification documents in `.kiro/specs/`.