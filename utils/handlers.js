const { host, login, dbHost, jQ } = require('./../constants/defaults');
const axios = require('axios');
const success = (data, message) => {
    const processed = {
        data,
        message,
        code: 200,
        timestamp: new Date(),
        status: 'success'
    }
    return processed;
}

const error = (message) => {
    const processed = {
        message,
        timestamp: new Date(),
        status: 'error'
    }
    return processed;
}

const queryParams = (url, query) => {
    const match = RegExp('[?&]' + query + '=([^&]*)').exec(url);
    return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
};

const jobStatusUpadate = async ({ _id, scheduleId, status }, percentage) => {
    return axios.get(`${dbHost}job/status/${_id}/${scheduleId}?percentage=${percentage}&status=${status}`).then(async (res) => {
        return res.data.data;
    });
};

const stopJob = async ({ _id, scheduleId }) => {
    return axios.get(`${dbHost}job/stop/${_id}/${scheduleId}`).then(async (res) => {
        return res.data.data;
    });
};

const jobLog = async (log, status) => {
    return axios.get(`${dbHost}job/log/${_id}/${scheduleId}?log=${log}&status=${status}`).then(async (res) => {
        return res.data.data;
    });
}

module.exports = { success, error, queryParams, jobStatusUpadate, jobLog, stopJob };