# ElevateHER

ElevateHER is a full-stack application designed to visualise and interact with data related to women's sports using Neo4j graph database technology. The user interface is built with React with an Express.js API handling data queries, authentication, and graph analytics.

## Features

- 🚀 **Interactive Dashboard**: A React-based UI with dynamic visualisations and navigation.
- 🔐 **User Authentication**: Local username/password login, session management with express-session, input sanitization, and secure cookies. 
- 🌐 **Google OAuth 2.0**: Authentication via Google using Passport.js for sign-in.
- 🏅 **Athletes**: Create/update athlete profiles, and fetch top, suggested, or random players.
- 🏢 **Organisation & Team Linking**: Create teams, link athletes to teams, and associate teams with leagues for graph modelling.
- 📈 **Graph Algorithms & Analytics**: Compute PageRank, detect communities, and export graph data to CSV and other formats.
- 🌐 **Graph Visualization**: Integration with **cytoscape** for graph data visualization.
- 🗃️ **Neo4j Database Integration**: Backend connected to a Neo4j graph database for storing and querying data.

## Tech Stack

**Frontend:**
- React
- React Router DOM
- React Icons
- Cytoscape

**Backend:**
- Node.js and Express.js
- Neo4j Driver
- Passport.js (Google OAuth)
- express-session, cookie-parser, helmet, cors
- bcrypt for password hashing
- Google APIs (googleapis)

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
  └── index.js

/server
  ├── utils
  │   ├── passport.js        # Google OAuth
  │   └── inputSanitizers.js # Input validation and sanitization
  ├── middleware
  │   └── authentication.js  # isAuthenticated & isAdmin middleware
  ├── services
  │   ├── PersonService.js   # Athlete and user management
  │   ├── OrganisationService.js
  │   ├── GraphService.js
  │   ├── EventService.js
  │   └── EventCalService.js # Google Calendar integration
  ├── routes
  │   └── neo4jRoutes.js     # API endpoints for data access
  ├── neo4j.js               # Neo4j driver configuration
  └── index.js               # Express server

/package.json
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

SESSION_SECRET=your_session_secret
CLIENT_ORIGIN=http://localhost:3000
BASE_PATH=/        # optional base path for static assets

GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/auth/google/callback
GOOGLE_ACCESS_TOKEN=...
GOOGLE_REFRESH_TOKEN=...

SSL_KEY_PATH=/path/to/ssl/key.pem
SSL_CERT_PATH=/path/to/ssl/cert.pem
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

**Authentication**
- `GET /auth/google` - Redirects to Google OAuth consent screen
- `GET /auth/google/callback` - OAuth callback endpoint
- `POST /api/login` - Local login with username/password
- `GET /api/auth/session` - Retrieve current session user
- `POST /api/logout` - Logout and clear session cookie

**Person and Athlete Management**
- `POST /api/person` - Create or update person profile
- `GET /api/person/top` - Get top users
- `GET /api/person/suggested` - Get suggested users
- `POST /api/person/auth` - Authenticate person (internal use)

**Graph Analytics**
- `GET /api/graph/similar/:name` - Get similar persons
- `GET /api/graph/pagerank` - Get PageRank scores
- `GET /api/graph/communities` - Detect communities
- `GET /api/graph/export` - Export graph edges to CSV

**Events and Calendar**
- `GET /api/events/past` - List past events from Neo4j
- `GET /api/events/upcoming` - List upcoming Google Calendar events

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