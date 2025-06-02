const path = require('path');
const Dotenv = require('dotenv-webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const basePath = process.env.BASE_PATH || '/';

module.exports = {
  entry: './client/src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.[contenthash].js',
    publicPath: process.env.BASE_PATH || '/',
    clean: true,
  },
  devtool: 'source-map',
  module: {
    rules: [
      {
        test: /\.(png|jpe?g|gif|svg)$/i,
        type: 'asset/resource',
      },
      {
        test: /\.(js|jsx)$/,
        include: path.resolve(__dirname, 'client/src'),
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { modules: false }],
              '@babel/preset-react',
            ],
          },
        },
      },
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.jsx'],
  },
  devServer: {
    port: process.env.PORT || process.env.DEV_PORT || 3000,
    historyApiFallback: {
      index: (process.env.BASE_PATH || '/') + 'index.html',
    },
    proxy: {
      '/api': {
        target: process.env.API_BASE,
        secure: false,
        changeOrigin: true,
        cookieDomainRewrite: { '*': '' },
        withCredentials: true,
      },
    },
    static: {
      publicPath: process.env.BASE_PATH || '/',
      directory: path.resolve(__dirname, 'client/public'),
    },
    open: true,
    hot: true,
    client: {
      overlay: true,
      webSocketURL: {
        hostname: 'localhost',
        port: process.env.PORT || process.env.DEV_PORT || 3000,
        protocol: 'ws',
      },
    },
  },
  plugins: [
    new Dotenv({ path: '.env', safe: false, systemvars: false, silent: true }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, 'client/public/index.html'),
      filename: 'index.html',
      publicPath: basePath,
    }),
  ],
  mode: process.env.NODE_ENV || 'development',
};