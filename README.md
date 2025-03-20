# ElevateHER

ElevateHER is a full-stack application designed to visualise and interact with data related to women's sports using Neo4j graph database technology. The user interface is built with React with an Express.js backend API for handling data queries and interactions.

## Features

- 🚀 **Interactive Dashboard**: A React-based UI with dynamic visualisations and navigation.
- 🔐 **User Authentication**: Login system to manage user access.
- 🌐 **Graph Visualization**: Integration with **cytoscape** for graph data visualization.
- 🗃️ **Neo4j Database Integration**: Backend connected to a Neo4j graph database for storing and querying data.

## Tech Stack

**Frontend:**
- React
- React Router DOM
- React Icons
- Cytoscape

**Backend:**
- Express.js
- Neo4j Driver
- dotenv (for environment variables)
- CORS

**Development Tools:**
- Webpack
- Babel
- Concurrently (to run client & server together)

## Project Structure

```
/client
  ├── App.js
  ├── Home.js
  ├── Dashboard.js
  ├── Login.js
  ├── HamburgerMenu.js
  └── index.js

/server
  ├── neo4j.js            # Neo4j DB configuration
  ├── neo4jRoutes.js      # API Routes for Neo4j interactions
  └── index.js            # Express Server Entry Point

/package.json             # Project dependencies and scripts
/webpack.config.js        # Webpack configuration
```

## Installation

1. **Clone the repository:**

```bash
git clone https://github.com/fleurest/elevateHER.git
cd elevateher
```

2. **Install dependencies:**

```bash
npm install
```

3. **Setup Environment Variables:**

Create a `.env` file in the `server` directory:

```
NEO4J_URI=neo4j+s://<your-auradb-instance>.databases.neo4j.io
NEO4J_USER=your_neo4j_username
NEO4J_PASSWORD=your_neo4j_password
```

> **Note:** This project supports Neo4j AuraDB, which uses the `neo4j+s://` scheme. Replace `<your-auradb-instance>` with your instance's name.

4. **Run the Application:**

```bash
npm start
```

This will concurrently start both the frontend development server and the backend Express server.

---

## Available Scripts

- `npm run start` - Runs both client and server concurrently
- `npm run start:client` - Starts React client only
- `npm run start:server` - Starts Express backend server only
- `npm run build` - Builds the client for production

---

## API Routes

Located in `/server/neo4jRoutes.js`, these endpoints handle interactions with the Neo4j database, such as fetching nodes, relationships, and custom Cypher queries.

---

## Contribution Guidelines

1. Fork the repo
2. Create your feature branch: `git checkout -b feature/YourFeature`
3. Commit your changes: `git commit -m 'Add your feature'`
4. Push to the branch: `git push origin feature/YourFeature`
5. Submit a pull request

---

## Author

**Fleur Edwards**

---

## License

This project is licensed under the ISC License.