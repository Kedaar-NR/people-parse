# People Parser

A web application for searching employee profiles using the CoreSignal API.

## Features

- Search for professionals by job title and company
- View detailed profile information including skills, education, and experience
- Clean, responsive web interface
- Real-time search results

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
```

2. Create a `.env` file with your API keys:
```bash
cp .env.example .env
# Edit .env and add your CoreSignal API key
```

3. Run the application:
```bash
python app.py
```

4. Open your browser to `http://localhost:8000`

## API Endpoints

- `GET /` - Main web interface
- `POST /api/search` - Search for people
- `GET /api/health` - Health check endpoint

## Technologies

- **Backend**: FastAPI, Python 3.9+
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **API**: CoreSignal Employee Data API
