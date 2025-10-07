
const formatCount = (count) => {
    if (count) {
        if (count >= 1e9) {
            return (count / 1e9).toFixed(1) + 'B';
        }else if (count >= 1e6) {
            return (count / 1e6).toFixed(1) + 'M';
        } else if (count >= 1e3) {
            return (count / 1e3).toFixed(1) + 'k';
        } else {
            return count.toFixed(1);
        }
    } else {
        return 0
    }

};

module.exports = formatCount