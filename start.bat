@echo off
echo Starting OneRun application...

echo Starting backend server...
start cmd /k "cd backend && npm run dev"

echo Starting frontend server...
start cmd /k "cd frontend && npm start"

echo OneRun started! You can access the application at: http://localhost:3000
