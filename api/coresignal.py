"""Coresignal API client for searching employee profiles"""

import httpx
from typing import Optional, Dict, List
import os


class CoreSignalClient:
    """Client for interacting with Coresignal Employee API"""

    BASE_URL = "https://api.coresignal.com/cdapi"

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize the Coresignal client

        Args:
            api_key: Coresignal API key. If not provided, reads from environment.
        """
        self.api_key = api_key or os.getenv("CORESIGNAL_API_KEY")
        if not self.api_key:
            raise ValueError("Coresignal API key is required")

    async def search_person(
        self,
        name: str,
        company: Optional[str] = None,
        limit: int = 10
    ) -> Dict:
        """
        Search for person profiles by name and optionally company
        Uses two-step process: search for IDs, then collect full profiles

        Args:
            name: Person's name to search for (treated as job title)
            company: Optional company name to filter results
            limit: Maximum number of results to return (default: 10)

        Returns:
            Dict containing search results from Coresignal API

        Raises:
            httpx.HTTPError: If the API request fails
        """
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                # Step 1: Search for employee IDs
                search_endpoint = f"{self.BASE_URL}/v2/employee_base/search/filter"
                search_payload = {"title": name}
                if company:
                    search_payload["company_name"] = company

                headers = {
                    "apikey": self.api_key,
                    "Content-Type": "application/json",
                    "accept": "application/json"
                }

                search_response = await client.post(
                    search_endpoint,
                    json=search_payload,
                    headers=headers
                )
                search_response.raise_for_status()
                employee_ids = search_response.json()

                # Limit the number of IDs to collect
                if isinstance(employee_ids, list):
                    employee_ids = employee_ids[:limit]
                else:
                    return {"error": "Unexpected response format from search", "results": []}

                # Step 2: Collect full profiles for each ID
                results = []
                collect_headers = {
                    "apikey": self.api_key,
                    "accept": "application/json"
                }

                for employee_id in employee_ids:
                    collect_endpoint = f"{self.BASE_URL}/v2/employee_base/collect/{employee_id}"
                    try:
                        collect_response = await client.get(
                            collect_endpoint,
                            headers=collect_headers
                        )
                        collect_response.raise_for_status()
                        profile_data = collect_response.json()
                        results.append(profile_data)
                    except Exception as e:
                        # Skip failed individual requests
                        continue

                return {"results": results}

        except httpx.HTTPError as e:
            error_detail = str(e)
            if hasattr(e, "response") and e.response is not None:
                try:
                    error_body = e.response.json()
                    error_detail = f"{str(e)} - Response: {error_body}"
                except:
                    error_detail = f"{str(e)} - Response text: {e.response.text}"
            return {
                "error": error_detail,
                "status_code": getattr(e.response, "status_code", None) if hasattr(e, "response") else None,
                "results": []
            }

    def extract_profiles(self, raw_data: Dict) -> List[Dict]:
        """
        Extract and format profile data from Coresignal API response

        Args:
            raw_data: Raw response from Coresignal API

        Returns:
            List of formatted profile dictionaries
        """
        if "error" in raw_data:
            return []

        profiles = []
        results = raw_data.get("results", [])

        for result in results:
            # Extract current company from experience
            current_company = "N/A"
            experience_months = 0
            experience = result.get("experience", [])

            if isinstance(experience, list) and len(experience) > 0:
                # Get the most recent experience (first in the list)
                latest_exp = experience[0] if experience else {}
                current_company = latest_exp.get("company_name", "N/A")

                # Calculate total experience months
                for exp in experience:
                    date_from = exp.get("date_from")
                    date_to = exp.get("date_to")
                    # Calculate months if dates are available
                    # For now, just count the number of experiences
                    if date_from and date_to:
                        # Simple estimation: assume average of 24 months per experience
                        experience_months += 24

            # Extract skills
            skills_list = []
            skills_data = result.get("skills", [])
            if isinstance(skills_data, list):
                skills_list = [skill.get("name", skill) if isinstance(skill, dict) else str(skill) for skill in skills_data]

            # Extract education
            education_list = []
            education_data = result.get("education", [])
            if isinstance(education_data, list):
                for edu in education_data:
                    if isinstance(edu, dict):
                        school = edu.get("school", "")
                        degree = edu.get("degree", "")
                        if school or degree:
                            education_list.append({"school": school, "degree": degree})
                    elif isinstance(edu, str):
                        education_list.append({"school": edu, "degree": ""})

            profile = {
                "name": result.get("full_name", "N/A"),
                "title": result.get("headline", "N/A"),
                "company": current_company,
                "location": result.get("location", "N/A"),
                "experience_months": experience_months,
                "skills": skills_list,
                "education": education_list,
                "linkedin_url": result.get("profile_url", ""),
                "source": "Coresignal"
            }
            profiles.append(profile)

        return profiles
