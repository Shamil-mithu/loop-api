const send = (status, httpStatusCode, message = null, data, res, errors) => {
    res.status(httpStatusCode).send({
        status: status,
        message: message,
        data: data,
        errors: errors
    });
}
module.exports = {
    send
}