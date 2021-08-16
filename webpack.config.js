const nodeExternals = require('webpack-node-externals');

module.exports = {
  mode: 'production',
  entry: "./lib/index.ts",
  target: 'webworker',
  output: {
    filename: "index.js",
    library: {
      name: 'leetcodeProgress',
      type: 'umd'
    }
  },
  resolve: {
    extensions: [".ts", ".js"]
  },
  module: {
    rules: [
      { test: /\.tsx?$/, loader: "ts-loader" },
      {
        test: /\.svg$/i,
        use: [
          {
            loader: 'raw-loader',
            options: {
              esModule: false
            }
          }
        ]
      }
    ]
  },
  externals: nodeExternals()
}