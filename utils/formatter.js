const removeSplChar = (val, isNumber) => {
    val = val ? val.replace(/[^\w\s]/gi, '') : null;
    if (isNumber && val) {
        val = Number(val);
    }
    return val;
}
module.exports = { removeSplChar };