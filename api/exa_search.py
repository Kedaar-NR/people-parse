"""Exa AI client for searching public LinkedIn-style profiles."""

import os
from typing import Dict, List, Optional

import httpx


class ExaSearchClient:
    """Lightweight client for the Exa Search API."""

    BASE_URL = "https://api.exa.ai"

    def __init__(self, api_key: Optional[str] = None) -> None:
        """
        Initialize the Exa client.

        Args:
            api_key: Exa API key. If not provided, reads from environment.
        """
        self.api_key = api_key or os.getenv("EXA_API_KEY")
        if not self.api_key:
            raise ValueError("Exa API key is required")

    async def search_profiles(
        self,
        name: str,
        company: Optional[str] = None,
        limit: int = 5
    ) -> List[Dict]:
        """
        Search for likely LinkedIn profile URLs using Exa.

        Args:
            name: Person's name to search for.
            company: Optional company to refine the query.
            limit: Max number of results to return.

        Returns:
            Normalized list of profile dictionaries compatible with the UI.
        """
        name = (name or "").strip()
        if not name:
            return []

        query = self._build_query(name, company)
        headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
            "accept": "application/json"
        }
        payload = {
            "query": query,
            "use_autoprompt": True,
            "num_results": limit,
            "include_domains": ["linkedin.com"]
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.BASE_URL}/search",
                    headers=headers,
                    json=payload
                )
                response.raise_for_status()
                data = response.json()
                results = data.get("results", [])
        except Exception:
            return []

        return self._normalize_results(results, name)

    def _build_query(self, name: str, company: Optional[str]) -> str:
        """Craft a targeted search query for LinkedIn profile pages."""
        parts = [name]
        if company:
            parts.append(company)
        parts.append("LinkedIn profile")
        parts.append("site:linkedin.com/in")
        return " ".join(part for part in parts if part)

    def _normalize_results(self, results: List[Dict], fallback_name: str) -> List[Dict]:
        """Map Exa results into the profile shape expected by the UI."""
        normalized = []

        for res in results:
            title = (res.get("title") or "").strip()
            linkedin_url = (res.get("url") or "").strip()
            summary = self._extract_snippet(res)

            normalized.append({
                "name": self._extract_name(title, fallback_name),
                "title": title or "LinkedIn profile",
                "company": "",
                "location": "",
                "experience_months": 0,
                "skills": [],
                "education": [],
                "linkedin_url": linkedin_url,
                "summary": summary,
                "positions": [],
                "photo_url": "",
                "source": "Exa"
            })

        return normalized

    def _extract_snippet(self, result: Dict) -> str:
        """Pick the most useful snippet-like text from the result."""
        for key in ("highlight", "snippet", "summary", "text"):
            snippet = result.get(key)
            if isinstance(snippet, str) and snippet.strip():
                return snippet.strip()
        return ""

    def _extract_name(self, title: str, fallback: str) -> str:
        """Derive a reasonable display name from the result title."""
        if not title:
            return fallback

        primary = title.split("|")[0].strip()
        primary = (primary.split(" - ")[0] or primary).strip()
        return primary or fallback
