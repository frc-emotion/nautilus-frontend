# Nautilus Frontend

> [!WARNING]
> Nautilus is currently in early stage development. Features may be missing and backwards compatibility is not guaranteed in future versions.

Nautilus is a mobile native scouting and attendance solution for FIRST Robotics Competition teams.

## Getting Started

> [!NOTE]
> Temporary section, replace later in proper documentation

Important note before we begin: Ensure you have a proper understanding of Git and its development pipeline before contributing to any repository. [This](https://www.youtube.com/watch?v=hwP7WQkmECE) is a great introductory video.

**Install these:**

Main dependencies: Node.JS, NPM, Visual Studio Code, Git

Also: make sure you have Android Studio installed, or XCode if you have a Mac and want to test on iPhone. For XCode, ensure your Mac supports the latest version of macOS.

Ensure you install the Android Emulator for Android Studio, or an iPhone Simulator if developing on XCode. If these are not working on your machine, a testing environment can be run in your browser, however this is not ideal as it does not simulate a native phone environment.

Once you have everything installed, clone the repository by running:

```sh
git clone https://github.com/frc-emotion/nautilus-frontend.git
```

You may be prompted to enter authentication details. For this, you may need to generate a Personal Access Token to use as your GitHub Password. See [here](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) if you need instructions.

Once the repository is successfully cloned onto your machine, install all necessary dependencies by running:

```sh
yarn install
```

After you have completed these steps, your development environment should be fully set up, making you ready for development and writing your first contribution.

Command for building
```sh
npx eas build --platform android --profile production --local
```
