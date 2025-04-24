# OneRun - Installation Guide

Follow these steps to set up and run the OneRun application:

## Prerequisites

Before starting, make sure you have the following installed:
- Node.js (v14+)
- MongoDB (running locally or accessible via connection string)
- npm or yarn

## Installation

1. Install dependencies for all components:

```bash
npm run install-all
```

This will install dependencies for:
- The root project
- The frontend React application
- The backend Node.js server

## Configuration

1. Backend configuration:
   - Verify that the `.env` file in the `backend` directory has the correct settings
   - Make sure MongoDB is running and accessible

2. Frontend configuration:
   - Verify that the `.env` file in the `frontend` directory is configured correctly

## Running the Application

To run the application in development mode:

```bash
npm run dev
```

This will start:
- The backend server on port 5000
- The frontend development server on port 3000

You can then access the application at: http://localhost:3000

## Troubleshooting

If you encounter any issues:

1. Make sure MongoDB is running
2. Check the console for error messages
3. Verify that all required ports (3000, 5000) are available
4. Ensure that all environment variables are correctly set
