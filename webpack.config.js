/* eslint-env node */

const path = require('path')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { version } = require('./package.json')

const BUILD_FOLDER = path.join(__dirname, 'build')

module.exports = {
  mode: process.env.NODE_ENV || 'development',
  entry: {
    index: './src/index.js',
    analytics: './analytics/index.js',
    test: './test/index.js'
  },
  output: {
    path: BUILD_FOLDER,
    filename: '[name].bundle.js'
  },
  plugins: [
    new CopyWebpackPlugin({
      patterns: [
        { context: './src', from: '*.css' },
        { context: './src', from: '*.gif' },
        { context: './src', from: 'hello.js' },
        { context: './src', from: 'hello.wasm' },
        { from: './models', to: 'models/' },
        { from: './rawImages', to: 'rawImages/' }
      ]
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      filename: path.resolve(BUILD_FOLDER, 'index.html'),
      chunks: ['index'],
      version
    }),
    new HtmlWebpackPlugin({
      template: './analytics/index.html',
      filename: path.resolve(BUILD_FOLDER, 'analytics.html'),
      chunks: ['analytics'],
      version
    }),
    new HtmlWebpackPlugin({
      template: './test/index.html',
      filename: path.resolve(BUILD_FOLDER, 'test.html'),
      chunks: ['test'],
      version
    })
  ],
  devtool: 'source-map',
  devServer: {
    proxy: {
      '/api': 'http://localhost:3090',
    },
  }
}
