#!/bin/bash

echo "Cleaning up ports 3000 (client) and 3001 (server)"

lsof -ti:3000 | xargs kill -9 2>/dev/null
lsof -ti:3001 | xargs kill -9 2>/dev/null

echo "Starting the app..."
npm run start
