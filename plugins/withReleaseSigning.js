const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Adds a `release` signing config for local App Bundle builds.
 *
 * Credentials are read from Gradle properties so they never live in the repo:
 *
 *   ~/.gradle/gradle.properties
 *   BIOLENS_UPLOAD_STORE_FILE=D:/Biolens/keys/biolens-upload.jks
 *   BIOLENS_UPLOAD_STORE_PASSWORD=…
 *   BIOLENS_UPLOAD_KEY_ALIAS=biolens-upload
 *   BIOLENS_UPLOAD_KEY_PASSWORD=…
 *
 * If the properties are missing, Gradle fails loudly rather than shipping an
 * unsigned bundle or, worse, one signed with the debug key.
 */
const SIGNING_BLOCK = `    signingConfigs {
        release {
            def keystorePath = findProperty('BIOLENS_UPLOAD_STORE_FILE')
            if (keystorePath) {
                storeFile file(keystorePath)
                storePassword findProperty('BIOLENS_UPLOAD_STORE_PASSWORD')
                keyAlias findProperty('BIOLENS_UPLOAD_KEY_ALIAS')
                keyPassword findProperty('BIOLENS_UPLOAD_KEY_PASSWORD')
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (contents.includes('BIOLENS_UPLOAD_STORE_FILE')) {
      return cfg;
    }

    const anchor = '    signingConfigs {\n';
    if (!contents.includes(anchor)) {
      throw new Error(
        'withReleaseSigning: could not find the signingConfigs block in android/app/build.gradle'
      );
    }
    contents = contents.replace(anchor, SIGNING_BLOCK);

    // Only the release build type must switch to the upload key. The debug
    // build type keeps the template debug keystore.
    const releaseDebugSigning =
      /(release\s*\{[^}]*?)signingConfig signingConfigs\.debug/;
    if (!releaseDebugSigning.test(contents)) {
      throw new Error(
        'withReleaseSigning: could not find the release signingConfig reference'
      );
    }
    contents = contents.replace(releaseDebugSigning, '$1signingConfig signingConfigs.release');

    cfg.modResults.contents = contents;
    return cfg;
  });
};
