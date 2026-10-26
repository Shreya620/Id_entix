# Identix — Student Data Verification System

## About the Project

Identix is a student data verification and correction platform designed to help educational institutions validate student records, identify incorrect or duplicate information, and manage the student verification workflow.

The project focuses on improving the reliability of student data associated with APAAR-based student validation.

## Problem Statement

Educational institutions need a reliable way to validate student records, identify data-entry errors, and manage corrections before records are verified. Manual checking can be time-consuming and may lead to duplicate or inaccurate entries.

Identix aims to simplify this process through CSV-based data import, automated validation, and a structured verification workflow.

## Key Features

- Institution login and dashboard
- CSV-based student data import
- Required-column and file-type validation
- Student name, roll number, and APAAR ID validation
- Duplicate roll number and APAAR ID detection
- Student record storage using MongoDB
- Student record viewing through the dashboard
- Batch submission for verification
- Correction and resubmission workflow
- Admin review and verification
- Student verification statuses, including pending and verified

## Technology Stack

**Frontend**
- React
- Vite
- JavaScript
- Axios
- Lucide React

**Backend**
- Node.js
- Express.js
- REST API
- JWT-based authentication

**Database**
- MongoDB
- Mongoose

**Development Tools**
- Visual Studio Code
- Git and GitHub
- Postman

## Project Structure

```text
Id_entix/
├── client/
├── server/
│   ├── src/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── models/
│   └── scripts/
├── sample-data/
└── README.md
```

## Getting Started

### Prerequisites

- Node.js and npm
- MongoDB connection
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/Shreya620/Id_entix.git
cd Id_entix
```

### 2. Set Up the Backend

```bash
cd server
npm install
```

Configure the environment variables required by the backend in a `.env` file. Use the variable names expected by the project code, including the MongoDB connection string and JWT secret.

Start the backend using the command configured in the server's `package.json`. If no start script is configured, use:

```bash
node src/server.js
```

The backend runs on port `5001` in the current development setup.

### 3. Set Up the Frontend

Open another terminal from the project root:

```bash
cd client
npm install
npm run dev
```

Open the local URL displayed by Vite in the terminal.

## CSV Student Import

The student import workflow accepts CSV files containing these required columns:

```text
studentName,rollNumber,apaarId,course,academicYear
```

Example:

```csv
studentName,rollNumber,apaarId,course,academicYear
Demo Student One,VAL901,987654321012,BTech,2026-27
Demo Student Two,VAL902,987654321013,BTech,2026-27
```

The system checks required columns, validates student information, detects duplicate identifiers, and reports rejected records. Valid records can be saved to MongoDB.

## Verification Workflow

1. An institution logs in.
2. Student records are imported using a CSV file.
3. The system validates records and identifies errors.
4. Student records are submitted through the verification workflow.
5. An administrator reviews the submitted records.
6. Records may be returned for correction or approved.
7. Corrected records can be resubmitted for review.

## Security Notes

- Keep database credentials and environment variables private.
- Never upload `.env` files or secrets to GitHub.
- Use authorized accounts for protected APIs.
- Use synthetic student data for demonstrations.

## Project Status

Identix is an actively developed prototype. The institution dashboard, CSV import and validation, student records display, and batch verification workflow have been tested.

## Team

**Team Name:** Identix

**Problem Statement:** SIH26263 — APAAR-Based Student Data Verification and Validation

## Repository

https://github.com/Shreya620/Id_entix