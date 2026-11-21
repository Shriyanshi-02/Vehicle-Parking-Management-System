# Vehicle Parking Management System

A web-based Vehicle Parking Management System built with Flask and JavaScript to manage parking lots, parking spaces, and vehicle reservations.

## Overview

This project provides a centralized platform for managing vehicle parking operations. It includes a Python Flask backend and a web-based frontend.

## Features

- Parking lot and parking spot management
- User and administrator roles
- Vehicle parking reservations
- Reservation management
- Email integration
- PDF report generation
- Background task processing

## Technology Stack

| Component | Technologies |
|---|---|
| Backend | Python, Flask |
| Frontend | HTML, CSS, JavaScript |
| Database | SQLite, Flask-SQLAlchemy |
| Authentication | Flask-Security, Flask-Login |
| Background Tasks | Celery |
| Reports | FPDF, ReportLab, Matplotlib |
| Email | Flask-Mail |

## Project Structure

```text
Vehicle-Parking-App/
├── backend/
│   ├── apps_celery/
│   ├── config.py
│   ├── extentions.py
│   ├── models.py
│   └── routes.py
├── Frontend/
│   ├── components/
│   ├── css/
│   ├── js/
│   ├── pages/
│   ├── pics/
│   └── index.html
├── app.py
├── requirements.txt
├── .env.example
└── .gitignore
```

## Installation and Setup

### 1. Clone the repository

```bash
git clone YOUR_REPOSITORY_URL
cd Vehicle-Parking-App
```

### 2. Create a virtual environment

```bash
python -m venv .venv
```

Activate it on Windows:

```powershell
.venv\Scripts\Activate.ps1
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment variables

Create a `.env` file using `.env.example` as a reference.

Set your own secure values for:

- `SECRET_KEY`
- `SECURITY_PASSWORD_SALT`
- `DATABASE_URL`
- `MAIL_USERNAME`
- `MAIL_PASSWORD`
- `MAIL_DEFAULT_SENDER`

Never commit your actual `.env` file.

### 5. Run the application

```bash
python app.py
```

Open your browser at:

http://127.0.0.1:5000

## Security

- Credentials are managed through environment variables.
- The `.env` file is excluded from Git.
- No default demo passwords are included.

## License

This project is available for educational and learning purposes.

