import json
import re


def parse_log_entry_with_ai(text: str, matter_names: list, provider: str, api_key: str) -> dict:
    """
    Parse a time log entry using an AI provider.

    Args:
        text: The user's time entry text
        matter_names: List of available matter names
        provider: "claude", "gemini", "openai", or "grok"
        api_key: The API key for the provider

    Returns:
        {
            "matter_name": str or None,
            "duration_minutes": int or None,
            "date": "YYYY-MM-DD" or None,
            "description": str or None
        }
    """
    try:
        prompt = _build_prompt(text, matter_names)

        if provider == "claude":
            raw = _call_claude(prompt, api_key)
        elif provider == "gemini":
            raw = _call_gemini(prompt, api_key)
        elif provider == "openai":
            raw = _call_openai(prompt, api_key)
        elif provider == "grok":
            raw = _call_grok(prompt, api_key)
        else:
            return {}

        return _parse_json_response(raw)
    except Exception as e:
        print(f"AI Service Error ({provider}): {e}")
        return {}


def _build_prompt(text: str, matter_names: list) -> str:
    """Build the prompt for AI extraction."""
    names_list = "\n".join(f"- {n}" for n in matter_names)

    return f"""You are a legal timesheet assistant. Extract structured information from this time entry.

Available matters:
{names_list}

User entry: "{text}"

Return ONLY a valid JSON object with these fields (use null if you cannot determine a field):
{{"matter_name": "exact name from the list above or null", "duration_minutes": 90, "date": "YYYY-MM-DD or null", "description": "clean, concise work description"}}

Rules:
- matter_name MUST be an exact match from the list, or null
- duration_minutes must be an integer >= 0, or null
- date must be YYYY-MM-DD format or null
- Return only JSON, no other text"""


def _call_claude(prompt: str, api_key: str) -> str:
    """Call Claude API."""
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=api_key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=256,
            messages=[{"role": "user", "content": prompt}]
        )
        return msg.content[0].text
    except ImportError:
        raise ImportError("anthropic package not installed. Run: pip install anthropic")


def _call_gemini(prompt: str, api_key: str) -> str:
    """Call Gemini API."""
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text
    except ImportError:
        raise ImportError("google-generativeai package not installed. Run: pip install google-generativeai")


def _call_openai(prompt: str, api_key: str) -> str:
    """Call OpenAI API."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        resp = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256
        )
        return resp.choices[0].message.content
    except ImportError:
        raise ImportError("openai package not installed. Run: pip install openai")


def _call_grok(prompt: str, api_key: str) -> str:
    """Call Grok API (xAI) using OpenAI-compatible endpoint."""
    try:
        from openai import OpenAI
        client = OpenAI(api_key=api_key, base_url="https://api.x.ai/v1")
        resp = client.chat.completions.create(
            model="grok-2-latest",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=256
        )
        return resp.choices[0].message.content
    except ImportError:
        raise ImportError("openai package not installed. Run: pip install openai")


def _parse_json_response(raw: str) -> dict:
    """Extract and parse JSON from the AI response."""
    try:
        # Try to find a JSON object in the response
        match = re.search(r'\{[^{}]*\}', raw, re.DOTALL)
        if match:
            data = json.loads(match.group())
            # Validate and clean the response
            return {
                "matter_name": data.get("matter_name"),
                "duration_minutes": data.get("duration_minutes"),
                "date": data.get("date"),
                "description": data.get("description")
            }
    except (json.JSONDecodeError, AttributeError):
        pass

    return {}
