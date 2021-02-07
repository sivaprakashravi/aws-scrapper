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
module.exports = { success, error };