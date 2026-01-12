"""FastAPI application for people parsing and search"""

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from typing import Optional
import os
from dotenv import load_dotenv

from api.coresignal import CoreSignalClient
from utils.formatter import format_experience, format_skills, format_education

# Load environment variables
load_dotenv()

app = FastAPI(title="People Parser", description="Search for people using CoreSignal API")

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

# Setup templates
templates = Jinja2Templates(directory="templates")


class SearchRequest(BaseModel):
    """Request model for person search"""
    name: str
    company: Optional[str] = None
    limit: int = 10


@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    """Render the main page"""
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/api/search")
async def search_person(search_request: SearchRequest):
    """
    Search for a person using CoreSignal API

    Args:
        search_request: SearchRequest with name, optional company, and limit

    Returns:
        Formatted search results
    """
    try:
        # Initialize CoreSignal client
        client = CoreSignalClient()

        # Search for person
        raw_results = await client.search_person(
            name=search_request.name,
            company=search_request.company,
            limit=search_request.limit
        )

        # Check for errors in the response
        if "error" in raw_results:
            raise HTTPException(
                status_code=raw_results.get("status_code", 500),
                detail=raw_results["error"]
            )

        # Extract profiles
        profiles = client.extract_profiles(raw_results)

        # Format profiles for display
        formatted_profiles = []
        for profile in profiles:
            formatted_profile = {
                "name": profile["name"],
                "title": profile["title"],
                "company": profile["company"],
                "location": profile["location"],
                "experience": format_experience(profile["experience_months"]),
                "skills": format_skills(profile["skills"]),
                "education": format_education(profile["education"]),
                "linkedin_url": profile["linkedin_url"],
                "source": profile["source"]
            }
            formatted_profiles.append(formatted_profile)

        return {
            "success": True,
            "count": len(formatted_profiles),
            "results": formatted_profiles
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "coresignal_configured": bool(os.getenv("CORESIGNAL_API_KEY"))
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
