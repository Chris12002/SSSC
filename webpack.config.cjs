const path = require('path');

module.exports = {
  mode: 'development', // or 'production'
  entry: './src/renderer/index.tsx',
  output: {
    path: path.resolve(__dirname, 'dist/renderer'),
    filename: 'bundle.js',
  },
  target: 'electron-renderer',
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        include: /src/,
        use: {
          loader: 'babel-loader',
          options: {
            configFile: './src/renderer/babel.config.js',
          },
        },
      },
    ],
  },
};
