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

**Option A: Direct Python**
```bash
python app.py
```

**Option B: Using the run script**
```bash
./run.sh
```

**Option C: Using uvicorn (recommended for development)**
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

4. Open your browser to `http://localhost:8000`

### Local quickstart
- Ensure `CORESIGNAL_API_KEY` is set in `.env` or your shell environment.
- From the repo root, run `uvicorn app:app --reload --host 0.0.0.0 --port 8000`.
- Visit `http://localhost:8000` in the browser to use the UI.

### Quick notes
- This is a FastAPI app (not Streamlit). Use `uvicorn app:app --host 0.0.0.0 --port $PORT` as the start command on any host.
- Required env var everywhere: `CORESIGNAL_API_KEY`.
- Health check for deployments: `GET /api/health` should return `"coresignal_configured": true`.

## API Endpoints

- `GET /` - Main web interface
- `POST /api/search` - Search for people
- `GET /api/health` - Health check endpoint

## Technologies

- **Backend**: FastAPI, Python 3.9+
- **Frontend**: Vanilla JavaScript, CSS3, HTML5
- **API**: CoreSignal Employee Data API

## Deployment

### Deploy to Render (Recommended - Free Tier Available)

1. Go to [render.com](https://render.com) and sign up
2. Click "New +" → "Web Service"
3. Connect your GitHub repository: `Kedaar-NR/people-parse`
4. Render will auto-detect the `render.yaml` configuration
5. Add environment variable: `CORESIGNAL_API_KEY`
6. Click "Create Web Service"

Your app will be live at `https://your-app-name.onrender.com`

### Deploy to Railway

1. Go to [railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `Kedaar-NR/people-parse`
4. Add environment variable: `CORESIGNAL_API_KEY`
5. Railway auto-deploys using `railway.json`

### Deploy to Heroku

```bash
# Install Heroku CLI, then:
heroku create your-app-name
heroku config:set CORESIGNAL_API_KEY=your_api_key_here
git push heroku main
```

### Deploy with Docker

```bash
# Build the Docker image
docker build -t people-parser .

# Run the container
docker run -p 8000:8000 -e CORESIGNAL_API_KEY=your_api_key_here people-parser
```

### Deploy to AWS/GCP/Azure

Use the included `Dockerfile` to deploy to any cloud platform:
- **AWS**: Elastic Beanstalk, ECS, or App Runner
- **GCP**: Cloud Run or App Engine
- **Azure**: App Service or Container Instances
