require('dotenv').config();
const neo4j = require('neo4j-driver');

const URI = process.env.NEO4J_URI;
const USER = process.env.NEO4J_USER;
const PASSWORD = process.env.NEO4J_PASSWORD;

// Driver
const driver = neo4j.driver(URI, neo4j.auth.basic(USER, PASSWORD));

// Verify connection
async function verifyConnection() {
  try {
    const serverInfo = await driver.getServerInfo();
    console.log('Connected to Neo4j Aura');
    console.log(serverInfo);
  } catch (err) {
    console.error(`Connection error\n${err}\nCause: ${err.cause}`);
  }
}

// Export driver and connection message
module.exports = {
  driver,
  verifyConnection
};
