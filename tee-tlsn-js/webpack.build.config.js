const webpack = require('webpack');
const path = require('path');
const isProd = process.env.NODE_ENV === 'production';

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: 'development',
});

const rules = [
  {
    test: /\.tsx?$/,
    exclude: [/(node_modules|.webpack)/],
    rules: [
      {
        loader: 'ts-loader',
        options: {
          configFile: 'tsconfig.json',
          transpileOnly: true,
        },
      },
    ],
  },
  {
    test: /\.node$/,
    use: 'node-loader',
  },
];

var alias = {
  stream: require.resolve('stream-browserify'),
  // crypto: require.resolve('crypto-browserify'),
  // vm: require.resolve('vm-browserify'),
};

var fileExtensions = [
  'jpg',
  'jpeg',
  'png',
  'gif',
  'eot',
  'otf',
  'svg',
  'ttf',
  'woff',
  'woff2',
];

module.exports = [
  {
    mode: isProd ? 'production' : 'development',
    entry: {
      lib: path.join(__dirname, 'src', 'lib.ts'),
    },
    target: 'webworker',
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.js'],
    },
    node: {
      __dirname: true,
    },
    module: {
      rules: [...rules],
    },
    output: {
      publicPath: '',
      path: __dirname + '/build',
      filename: `[name].js`,
      libraryTarget: 'umd',
      globalObject: 'this',
      umdNamedDefine: true,
    },
    plugins: [
      envPlugin,
    ],
    resolve: {
      alias: alias,
      extensions: fileExtensions
        .map((extension) => '.' + extension)
        .concat(['.js', '.jsx', '.ts', '.tsx', '.css']),
      fallback: {
        stream: require.resolve('stream-browserify'),
      },
    }
  },
];
