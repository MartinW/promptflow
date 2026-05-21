/** @type {import('@docusaurus/types').PluginModule} */
module.exports = function webpackCompatPlugin() {
  return {
    name: "webpack-compat",
    configureWebpack(config, isServer) {
      if (isServer) return {};
      // Disable scope hoisting on the client bundle — webpack 5 ConcatenationScope
      // fails with "Unexpected end of JSON input" in Bun workspace environments
      // when it tries to parse hex-encoded module reference IDs.
      return {
        optimization: {
          concatenateModules: false,
        },
      };
    },
  };
};
