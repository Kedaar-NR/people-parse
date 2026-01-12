"""Coresignal API client for searching employee profiles"""

import httpx
from typing import Optional, Dict, List
from datetime import datetime
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
            name: Person's full name to search for
            company: Optional company name to filter results
            limit: Maximum number of results to return (default: 10)

        Returns:
            Dict containing search results from Coresignal API

        Raises:
            httpx.HTTPError: If the API request fails
        """
        try:
            # Normalize inputs early
            name = name.strip()
            if not name:
                return {"results": []}

            async with httpx.AsyncClient(timeout=60.0) as client:
                # Step 1: Search for employee IDs using full name first, then fallbacks
                search_payloads = self._build_search_payloads(name, company)
                employee_ids = []
                last_error = None

                for payload in search_payloads:
                    try:
                        employee_ids = await self._search_employee_ids(client, payload)
                        if employee_ids:
                            break
                    except httpx.HTTPError as e:
                        # Keep the last error to bubble up if all attempts fail
                        last_error = e
                        continue

                if not employee_ids:
                    if last_error:
                        raise last_error
                    return {"results": []}

                # Limit the number of IDs to collect
                employee_ids = employee_ids[:limit]

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
            experience_entries = experience if isinstance(experience, list) else []

            if experience_entries:
                # Get the most recent experience (first in the list)
                latest_exp = experience_entries[0]
                current_company = latest_exp.get("company_name", "N/A")

                # Calculate total experience months using available date ranges
                experience_months = self._compute_experience_months(experience_entries)

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

            raw_summary = result.get("summary") or result.get("about") or ""
            summary = raw_summary.strip() if isinstance(raw_summary, str) else ""

            location = result.get("location") or result.get("city") or result.get("country") or "N/A"
            profile = {
                "name": result.get("full_name", "N/A"),
                "title": result.get("headline", "N/A"),
                "company": current_company,
                "location": location,
                "experience_months": experience_months,
                "skills": skills_list,
                "education": education_list,
                "linkedin_url": self._extract_linkedin_url(result),
                "summary": summary,
                "positions": self._format_positions(experience_entries),
                "photo_url": self._extract_photo_url(result),
                "source": ""
            }
            profiles.append(profile)

        return profiles

    def _build_search_payloads(self, name: str, company: Optional[str]) -> List[Dict]:
        """
        Build a prioritized list of search payloads to improve hit rate.
        Tries exact full name first, then falls back to title-based search.
        """
        payloads = []

        base_full_name = {"full_name": name}
        if company:
            base_full_name["company_name"] = company
        payloads.append(base_full_name)

        # Fallback: search by headline/title if full name search returns nothing
        title_payload = {"title": name}
        if company:
            title_payload["company_name"] = company
        payloads.append(title_payload)

        return payloads

    async def _search_employee_ids(self, client: httpx.AsyncClient, payload: Dict) -> List[str]:
        """Execute the employee search and return a list of IDs."""
        search_endpoint = f"{self.BASE_URL}/v2/employee_base/search/filter"
        headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json",
            "accept": "application/json"
        }

        def parse_ids(resp: httpx.Response) -> List[str]:
            ids_json = resp.json()
            if not isinstance(ids_json, list):
                return []
            return ids_json

        response = None
        try:
            response = await client.post(
                search_endpoint,
                json=payload,
                headers=headers
            )
            response.raise_for_status()
            ids = parse_ids(response)
        except httpx.HTTPStatusError as e:
            # CoreSignal rejects unknown fields (e.g., company_name) with 422/extra_forbidden.
            # Retry once without the company filter so the user still gets results.
            if (
                e.response is not None
                and e.response.status_code == 422
                and any(k in payload for k in ("company_name", "company"))
            ):
                stripped_payload = {
                    k: v for k, v in payload.items() if k not in ("company_name", "company")
                }
                retry_resp = await client.post(
                    search_endpoint,
                    json=stripped_payload,
                    headers=headers
                )
                retry_resp.raise_for_status()
                ids = parse_ids(retry_resp)
            else:
                raise

        return ids

    def _extract_linkedin_url(self, profile: Dict) -> str:
        """
        Extract and normalize the LinkedIn URL from possible fields.
        Ensures a usable link even if protocol is missing.
        """
        url = profile.get("profile_url") or profile.get("linkedin_url") or profile.get("url") or ""

        if url and not url.startswith("http"):
            url = f"https://{url.lstrip('/')}"

        return url

    def _extract_photo_url(self, profile: Dict) -> str:
        """
        Try common keys for a profile photo/logo URL.
        """
        possible_keys = [
            "profile_image_url",
            "profile_picture_url",
            "picture_url",
            "avatar",
            "photo_url",
            "image_url",
            "picture"
        ]

        for key in possible_keys:
            url = profile.get(key)
            if url:
                if isinstance(url, dict):
                    url = url.get("url") or url.get("src")
                if isinstance(url, str) and url.strip():
                    if not url.startswith("http"):
                        url = f"https://{url.lstrip('/')}"
                    return url

        return ""

    def _compute_experience_months(self, experiences: List[Dict]) -> int:
        """
        Calculate total experience duration in months from date ranges.
        Uses a month-precision timeline to avoid double-counting overlapping roles.
        """
        month_spans = set()

        for exp in experiences:
            if not isinstance(exp, dict):
                continue

            start = self._parse_date(exp.get("date_from"))
            end = self._parse_date(exp.get("date_to")) or datetime.utcnow()

            if not start or end < start:
                continue

            # Normalize to first of month for counting
            current = datetime(start.year, start.month, 1)
            end_month = datetime(end.year, end.month, 1)

            while current <= end_month:
                month_spans.add((current.year, current.month))
                # increment month
                year, month = current.year, current.month + 1
                if month > 12:
                    month = 1
                    year += 1
                current = datetime(year, month, 1)

        return len(month_spans)

    def _format_positions(self, experiences: List[Dict]) -> List[Dict]:
        """Format experience entries into a LinkedIn-style list for the UI."""
        positions = []
        seen_keys = set()

        for exp in experiences:
            if not isinstance(exp, dict):
                continue

            title = exp.get("title") or exp.get("position") or "Role"
            company = exp.get("company_name") or exp.get("company") or ""
            date_to_val = exp.get("date_to")
            is_current = (
                exp.get("current") is True
                or date_to_val in (None, "", "Present")
                or (isinstance(date_to_val, str) and date_to_val.lower() == "present")
            )
            start_dt = self._parse_date(exp.get("date_from"))
            end_dt = self._parse_date(date_to_val)
            period = self._format_date_range(exp.get("date_from"), date_to_val, is_current)

            # Deduplicate identical roles by title/company/period triple
            dedupe_key = (
                (title or "").strip().lower(),
                (company or "").strip().lower(),
                (period or "").strip().lower()
            )
            if dedupe_key in seen_keys:
                continue
            seen_keys.add(dedupe_key)

            positions.append({
                "title": title,
                "company": company,
                "period": period,
                "location": exp.get("location") or "",
                "description": exp.get("description") or "",
                "_start_dt": start_dt
            })

        # Sort positions by start date descending (most recent first)
        positions.sort(key=lambda p: p.get("_start_dt") or datetime.min, reverse=True)

        # Remove helper field before returning
        for pos in positions:
            pos.pop("_start_dt", None)

        return positions

    def _format_date_range(self, date_from: Optional[str], date_to: Optional[str], is_current: bool = False) -> str:
        """Return a human-friendly date range like 'Jan 2020 - Present'."""
        start_dt = self._parse_date(date_from)
        end_dt = None if is_current else self._parse_date(date_to)

        start_str = self._format_month_year(start_dt) if start_dt else ""
        end_str = "Present" if is_current or not end_dt else self._format_month_year(end_dt)

        if start_str and end_str:
            return f"{start_str} - {end_str}"
        return start_str or end_str or ""

    def _format_month_year(self, dt: Optional[datetime]) -> str:
        """Format a datetime as 'Mon YYYY'."""
        if not dt:
            return ""
        return dt.strftime("%b %Y")

    def _parse_date(self, date_value: Optional[str]) -> Optional[datetime]:
        """Parse various date string formats into a datetime object."""
        if not date_value:
            return None

        if isinstance(date_value, datetime):
            return date_value

        if isinstance(date_value, str):
            clean_value = date_value.strip()
            # Remove trailing Z if present
            if clean_value.endswith("Z"):
                clean_value = clean_value[:-1]

            for fmt in ("%Y-%m-%d", "%Y-%m", "%Y"):
                try:
                    return datetime.strptime(clean_value, fmt)
                except ValueError:
                    continue

            try:
                return datetime.fromisoformat(clean_value)
            except ValueError:
                return None

        return None
