const dotenv = require('dotenv');
dotenv.config({path: './config.env'});
console.log("CHECKING KEY:", process.env.GEMINI_API_KEY ? "FOUND" : "NOT FOUND");

const dbconfig = require('./config/dbConfig');
const server = require('./app');
const { suggestReply } = require('./controllers/aiController'); 
const authMiddleware = require('./middlewares/authMiddleware'); 

const port = process.env.PORT || process.env.PORT_NUMBER || 3000;
server.listen(port, () => {
    console.log('Listening to requests on PORT: ' + port);
});