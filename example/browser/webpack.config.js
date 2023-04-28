const path = require('path');

const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
    entry: './src/main.js',
    resolve: {
        fallback: {
            "buffer": false
        }
    },
    plugins: [
        new HtmlWebpackPlugin({
            title: 'Logging to Seq via Browser'
        }),
    ],
    module: {
        rules: [
            {
                test: /\.html$/,
                loader: 'html-loader',
            },
        ],
    },
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
        clean: true,
    },
};
