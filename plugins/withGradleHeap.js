const { withGradleProperties } = require('expo/config-plugins');

/**
 * App Bundle packaging (bundletool) runs inside the Gradle daemon and needs a
 * larger heap than the Expo template's default 2 GB once three ABIs, Hermes and
 * the native libraries are included. Without this the build fails with
 * "Java heap space" in :app:packageReleaseBundle.
 *
 * Kept in a plugin so the value survives `expo prebuild`.
 */
const JVM_ARGS = '-Xmx4096m -XX:MaxMetaspaceSize=1024m';

module.exports = function withGradleHeap(config) {
  return withGradleProperties(config, (cfg) => {
    const props = cfg.modResults;
    const existing = props.find(
      (item) => item.type === 'property' && item.key === 'org.gradle.jvmargs'
    );

    if (existing) {
      existing.value = JVM_ARGS;
    } else {
      props.push({ type: 'property', key: 'org.gradle.jvmargs', value: JVM_ARGS });
    }

    return cfg;
  });
};
