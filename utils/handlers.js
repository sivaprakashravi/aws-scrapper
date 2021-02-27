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
module.exports = { success, error, queryParams };