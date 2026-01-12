"""Utilities for formatting profile data for display"""

from typing import List, Dict


def format_experience(months: int) -> str:
    """
    Convert experience in months to human-readable format

    Args:
        months: Number of months of experience

    Returns:
        Formatted string like "2 years 3 months" or "6 months"
    """
    if months < 12:
        return f"{months} month{'s' if months != 1 else ''}"

    years = months // 12
    remaining_months = months % 12

    if remaining_months == 0:
        return f"{years} year{'s' if years != 1 else ''}"

    return f"{years} year{'s' if years != 1 else ''} {remaining_months} month{'s' if remaining_months != 1 else ''}"


def format_skills(skills: List[str], max_display: int = 5) -> Dict:
    """
    Format skills list for display

    Args:
        skills: List of skill strings
        max_display: Maximum number of skills to show initially

    Returns:
        Dict with 'visible' and 'hidden' skill lists
    """
    if not skills:
        return {"visible": [], "hidden": []}

    return {
        "visible": skills[:max_display],
        "hidden": skills[max_display:] if len(skills) > max_display else []
    }


def format_education(education: List[Dict]) -> List[str]:
    """
    Format education data for display

    Args:
        education: List of education dictionaries

    Returns:
        List of formatted education strings
    """
    formatted = []

    for edu in education:
        if isinstance(edu, dict):
            school = edu.get("school", "")
            degree = edu.get("degree", "")

            if school and degree:
                formatted.append(f"{degree} from {school}")
            elif school:
                formatted.append(school)
            elif degree:
                formatted.append(degree)
        elif isinstance(edu, str):
            formatted.append(edu)

    return formatted
