
const swaggerAuth = (req) => {
    try {
        const authorizationHeader = req.headers.authorization;
        const base64 = authorizationHeader?.substr(6);
        const credentials = Buffer.from(base64, "base64").toString();
        const [name, pass] = credentials?.split(":");
        return { name, pass };
    } catch {
        return undefined;
    }
};
module.exports = swaggerAuth