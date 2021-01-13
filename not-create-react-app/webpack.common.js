const path = require('path');
const {CleanWebpackPlugin} = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: {
        app: './src/index.js',
    },
    plugins: [
        new CleanWebpackPlugin(),
        new HtmlWebpackPlugin({
            title: 'Production',
        }),
        new CopyPlugin({
            patterns: [{
                from: path.resolve(__dirname, 'static'),
                to: path.resolve(__dirname, 'dist')
            }],
        }),
    ],
    resolve: { extensions: ["*", ".js", ".jsx"] },
    output: {
        filename: 'bundle.js',
        publicPath: "/dist/",
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [{
                test: /\.(js|jsx)$/i,
                include: path.resolve(__dirname, 'src'),
                loader: 'babel-loader',
                options: { presets: ["@babel/env"] }
            },
            {
                test: /\.css$/i,
                use: ['style-loader', 'css-loader'],
            },
        ]
    },
};
