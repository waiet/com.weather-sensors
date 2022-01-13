'use strict'


module.exports = {
    async getSensors({ homey, query }) {
        return await homey.app.getSensors();
    },

    async getProtocols({ homey, query }) {
        return await homey.app.getProtocols();
    },

    async getStatistics({ homey, query }) {
        return await homey.app.getStatistics();
    }
};
