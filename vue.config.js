/* eslint-disable no-undef */
module.exports = {
    publicPath: process.env.NODE_ENV === 'production'
        ? '/pure-suggest/'
        : '/',
    css: {
        loaderOptions: {
            sass: {
                prependData: `
                    @import "~bulma/sass/utilities/_all";
                    @import "@/assets/_shared.scss";
                `
            }
        }
    }
}