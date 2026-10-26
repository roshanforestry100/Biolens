const { withAppBuildGradle } = require('expo/config-plugins');

/**
 * Windows caps native tool paths at 260 characters. React Native's Fabric
 * codegen mirrors node_modules paths into `.o` filenames, which overflows that
 * limit for modules such as react-native-screens.
 *
 * CMake already knows how to hash over-long object paths; it just needs a
 * ceiling. Setting CMAKE_OBJECT_PATH_MAX well below MAX_PATH keeps every
 * generated object file short without touching source layout.
 */
const CMAKE_ARGS_BLOCK = `    defaultConfig {
        externalNativeBuild {
            cmake {
                arguments "-DCMAKE_OBJECT_PATH_MAX=180"
            }
        }
`;

module.exports = function withWindowsPathFix(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    if (contents.includes('CMAKE_OBJECT_PATH_MAX')) {
      return cfg;
    }

    if (!contents.includes('    defaultConfig {\n')) {
      throw new Error(
        'withWindowsPathFix: could not find defaultConfig in android/app/build.gradle'
      );
    }

    contents = contents.replace('    defaultConfig {\n', CMAKE_ARGS_BLOCK);
    cfg.modResults.contents = contents;
    return cfg;
  });
};
