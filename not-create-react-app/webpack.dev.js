const merge = require('webpack-merge');
const common = require('./webpack.common.js');
const path = require('path');

module.exports = merge(common, {
    mode: 'development',
    devtool: 'inline-source-map',
    devServer: {
        injectClient: false,
        contentBase: path.join(__dirname, "static/"),
        port: 3000,
        publicPath: "http://localhost:3000/dist/",
    },
    watchOptions: {
        ignored: /node_modules/
    }
});
