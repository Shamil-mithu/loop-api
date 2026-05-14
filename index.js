const app = require('./server.js')
let { API_PORT } = require('@src/config')
const { response } = require('@src/utils')
// require('./database')
// require('./socket')
// require('@src/cronJobs')
// const { initializeWalletService } = require('@src/services/google-wallet/walletServiceInstance');

//handle internal server errors 
app.use((err, req, res, next) => {
    console.error(err)
    return response.send(0, 500, "Internal Serval Error", null, res, err)
})

//Handle 404 routes 
app.all("*", (req, res) => {
    return response.send(0, 404, "This route does not exist", null, res, null)
})

//safe exit
process.on('SIGINT', () => {
    console.info('SIGINT signal received.');
    console.log('Closing the database connection.');
});

const initializeApp = async () => {
    try {
        // await initializeWalletService();
    } catch (error) {
        console.error("Error initializing Google Wallet Service:", error);
    }
};

app.listen(API_PORT, async () => {
    // await initializeApp();
    console.log(`Server is listening at http://localhost:${API_PORT}`);
});
