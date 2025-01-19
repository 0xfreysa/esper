const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';

const envPlugin = new webpack.EnvironmentPlugin({
  NODE_ENV: 'development',
  LOCAL_NOTARY: true,
  LOCAL_WS: false,
  HEADLESS: false,
});

const rules = [
  {
    test: /\.node$/,
    use: 'node-loader',
  },
  {
    test: /\.tsx?$/,
    exclude: /(node_modules|.webpack)/,
    use: [
      {
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
      },
    ],
  },
];

const rendererRules = [];

module.exports = [
  {
    target: 'web',
    mode: isProd ? 'production' : 'development',
    entry: {
      'full-integration-swapi.spec': path.join(__dirname, 'test', 'specs', 'full-integration-swapi.spec.ts'),
      'simple-verify': path.join(__dirname, 'test', 'specs', 'simple-verify.spec.ts'),
    },
    output: {
      path: __dirname + '/test-build',
      publicPath: '/',
      filename: `[name].js`,
    },
    devtool: 'source-map',
    resolve: {
      extensions: ['.ts', '.tsx', '.js', '.jsx', '.png', '.svg'],
      // modules: [
      //   path.resolve('./node_modules'),
      //   path.resolve(__dirname, compilerOptions.baseUrl),
      // ],
      // fallback: {
      //   browserify: require.resolve('browserify'),
      //   stream: require.resolve('stream-browserify'),
      //   path: require.resolve('path-browserify'),
      //   crypto: require.resolve('crypto-browserify'),
      //   os: require.resolve('os-browserify/browser'),
      //   http: require.resolve('stream-http'),
      //   https: require.resolve('https-browserify'),
      //   assert: require.resolve('assert/'),
      //   events: require.resolve('events/'),
      //   'ansi-html-community': require.resolve('ansi-html-community'),
      //   'html-entities': require.resolve('html-entities'),
      //   constants: false,
      //   fs: false,
      // },
    },
    module: {
      rules: [...rules, ...rendererRules],
    },
    plugins: [
      envPlugin,
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
      }),
      new webpack.ProvidePlugin({
        process: 'process',
      }),
      new HtmlWebpackPlugin({
        template: './test/test.ejs',
        filename: `index.html`,
        inject: true,
      }),
    ],
    stats: 'minimal',
    devServer: {
      historyApiFallback: true,
    },
  },
];
