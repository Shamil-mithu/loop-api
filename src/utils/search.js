function search(field, value) {
    const query = {};
    query[field] = { contains: value }; // Adjust this part based on your requirements
    return query;
}

module.exports = search
