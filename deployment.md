# Deployment Guide

Complete step-by-step guide to deploy the People Parser application.

## Quick Start (Local Development)

```bash
# Navigate to project directory
cd people-parser

# Install dependencies
pip install -r requirements.txt

# Create .env file with your API key
echo "CORESIGNAL_API_KEY=your_api_key_here" > .env
# Optionally add your Exa key
echo "EXA_API_KEY=your_exa_api_key_here" >> .env

# Run the app
python app.py

# Or use uvicorn with hot reload
uvicorn app:app --reload
```

Visit: http://localhost:8000

---

## Production Deployment Options

### Option 1: Render (Easiest - Free Tier)

**Why Render?**
- Free tier available
- Auto-deploys from GitHub
- HTTPS included
- Zero configuration needed

**Steps:**

1. **Sign up at [render.com](https://render.com)**

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect GitHub: `Kedaar-NR/people-parse`

3. **Configure Settings** (Auto-detected from `render.yaml`)
   - Name: `people-parser` (or your choice)
   - Branch: `main`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app:app --host 0.0.0.0 --port $PORT`

4. **Add Environment Variables**
   - Key: `CORESIGNAL_API_KEY`
   - Value: Your CoreSignal API key
   - Optional: `EXA_API_KEY` for Exa search fallback

5. **Deploy**
   - Click "Create Web Service"
   - Wait 2-3 minutes for deployment
   - Your app will be live at `https://people-parser.onrender.com`

**Auto-deploys:** Push to GitHub → Auto-deploys to Render

---

### Option 2: Railway (Developer Friendly)

**Why Railway?**
- $5 free credit monthly
- Fast deployments
- Great developer experience

**Steps:**

1. Go to [railway.app](https://railway.app)
2. Click "Start a New Project" → "Deploy from GitHub repo"
3. Select `Kedaar-NR/people-parse`
4. Add environment variable:
   - `CORESIGNAL_API_KEY` = your key
   - (Optional) `EXA_API_KEY` = your Exa key
5. Railway auto-detects settings from `railway.json`
6. Click "Deploy"

Live at: `https://people-parse-production.up.railway.app`

---

### Option 3: Docker (Any Cloud Platform)

**Build and run locally:**

```bash
# Build the image
docker build -t people-parser .

# Run the container
docker run -p 8000:8000 \
  -e CORESIGNAL_API_KEY=your_api_key_here \
  -e EXA_API_KEY=your_exa_api_key_here \
  people-parser
```

**Deploy to cloud:**

```bash
# Tag for Docker Hub
docker tag people-parser yourusername/people-parser

# Push to Docker Hub
docker push yourusername/people-parser

# Now deploy to any platform that supports Docker
```

---

### Option 4: Heroku

```bash
# Install Heroku CLI from https://devcenter.heroku.com/articles/heroku-cli

# Login to Heroku
heroku login

# Create app
heroku create people-parser

# Set environment variable
heroku config:set CORESIGNAL_API_KEY=your_api_key_here

# Deploy
git push heroku main

# Open app
heroku open
```

---

### Option 5: AWS (EC2 or App Runner)

**EC2 Deployment:**

```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone repo
git clone https://github.com/Kedaar-NR/people-parse.git
cd people-parse

# Install dependencies
pip install -r requirements.txt

# Set environment variable
export CORESIGNAL_API_KEY=your_api_key_here

# Run with nohup
nohup uvicorn app:app --host 0.0.0.0 --port 8000 &
```

**App Runner (Docker):**
1. Push Docker image to ECR
2. Create App Runner service
3. Point to your ECR image
4. Add environment variables
5. Deploy

---

### Option 6: Google Cloud Platform

**Cloud Run (Recommended):**

```bash
# Install gcloud CLI
gcloud auth login

# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/your-project/people-parser

# Deploy to Cloud Run
gcloud run deploy people-parser \
  --image gcr.io/your-project/people-parser \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars CORESIGNAL_API_KEY=your_api_key_here
```

---

## Environment Variables

Required for all deployments:

| Variable | Description | Example |
|----------|-------------|---------|
| `CORESIGNAL_API_KEY` | Your CoreSignal API key | `pCXpIm5PdkBqSKnMaKq3it4dq7eTtOLt` |
| `EXA_API_KEY` | Optional Exa API key for web search | `exa_xxx` |
| `PORT` | Port number (auto-set by platforms) | `8000` |

---

## Troubleshooting

**App won't start:**
- Check environment variables are set
- Verify CoreSignal API key is valid
- Check logs: `heroku logs --tail` or platform-specific logs

**Slow API responses:**
- CoreSignal API can take 5-10 seconds per search
- Consider adding loading indicators
- Implement caching for repeated searches

**CORS errors:**
- FastAPI CORS is configured for all origins
- Check your deployment platform's proxy settings

---

## Monitoring

**Health Check Endpoint:**
```bash
curl https://your-app.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "coresignal_configured": true
}
```

---

## Cost Estimates

| Platform | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Render | 750 hours/month | From $7/month |
| Railway | $5 credit/month | From $5/month |
| Heroku | None | From $5/month |
| AWS EC2 | 750 hours (t2.micro) | From $3.50/month |
| GCP Cloud Run | 2M requests/month | Pay per use |

**Recommendation:** Start with Render's free tier for testing, then scale as needed.
