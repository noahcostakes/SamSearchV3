"""AI-powered opportunity scoring using Claude or local Ollama models."""
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Any, Dict, List

import httpx

from app.config import settings
from app.core.logging_config import get_logger

logger = get_logger(__name__)

# Max parallel AI calls — balances throughput vs. API rate limits
_MAX_SCORING_WORKERS = 5


class AIScorer:
    """Score opportunities using Claude AI or local Ollama models."""

    def __init__(self, api_key: str | None = None):
        self.use_local = settings.USE_LOCAL_AI
        self.ollama_url = settings.OLLAMA_URL
        self.ollama_model = settings.OLLAMA_MODEL
        
        if not self.use_local:
            import anthropic
            self.client = anthropic.Anthropic(api_key=api_key or settings.ANTHROPIC_API_KEY)
            self.model = settings.ANTHROPIC_MODEL
            self.max_tokens = settings.ANTHROPIC_MAX_TOKENS
        else:
            logger.info(f"Using local Ollama model: {self.ollama_model}")

    def _build_scoring_prompt(
        self,
        profile: Dict[str, Any],
        opportunity: Dict[str, Any],
    ) -> str:
        """Build the scoring prompt for Claude."""
        # Build priority keywords section with higher weight indicator
        priority_keywords = profile.get('priority_keywords', [])
        priority_text = ""
        if priority_keywords:
            priority_text = f"\n- **🔥 Priority Keywords (High Weight):** {', '.join(priority_keywords)}"
        
        # Build past performance section
        past_perf = profile.get('past_performance_keywords', [])
        past_perf_text = ""
        if past_perf:
            past_perf_text = f"\n- **Past Performance Keywords:** {', '.join(past_perf)}"
        
        # Build contract preferences section
        contract_prefs = profile.get('contract_types_preference', [])
        contract_text = ""
        if contract_prefs:
            contract_text = f"\n- **Preferred Contract Types:** {', '.join(contract_prefs)}"
        
        # Build clearance section
        clearance = profile.get('clearance_level', 'None')
        clearance_text = f"\n- **Security Clearance:** {clearance}"
        
        # Build SAM registration section
        sam_ids = []
        if profile.get('cage_code'):
            sam_ids.append(f"CAGE: {profile['cage_code']}")
        if profile.get('uei_number'):
            sam_ids.append(f"UEI: {profile['uei_number']}")
        sam_text = ""
        if sam_ids:
            sam_text = f"\n- **SAM.gov Registration:** {', '.join(sam_ids)}"
        
        # Build role preferences
        role_prefs = []
        if profile.get('open_to_prime_contracting', True):
            role_prefs.append("Prime Contractor")
        if profile.get('open_to_subcontracting', True):
            role_prefs.append("Subcontractor")
        role_text = f"\n- **Open To:** {' and '.join(role_prefs)}" if role_prefs else ""
        
        return f"""You are an expert government contracting advisor. Analyze this opportunity for the company profile and provide a detailed relevance score.

## Company Profile
- **Company Name:** {profile.get('company_name', 'Unknown')}
- **Primary NAICS:** {profile.get('primary_naics', 'N/A')}
- **Secondary NAICS:** {', '.join(profile.get('secondary_naics', []))}
- **Core Competencies:** {', '.join(profile.get('core_competencies', []))}
- **Technical Skills:** {', '.join(profile.get('technical_skills', []))}{priority_text}{past_perf_text}
- **Certifications:** {', '.join(profile.get('certifications', []))}{clearance_text}{sam_text}
- **Target Contract Range:** ${profile.get('target_contract_min', 0):,} - ${profile.get('target_contract_max', 0):,}{contract_text}{role_text}
- **Service Area:** {', '.join(profile.get('service_area', []))}
- **Blacklist Keywords:** {', '.join(profile.get('blacklist_keywords', []))}

## Opportunity
- **Title:** {opportunity.get('title', 'N/A')}
- **Solicitation Number:** {opportunity.get('solicitationNumber', 'N/A')}
- **Agency:** {opportunity.get('department', 'N/A')} / {opportunity.get('subTier', 'N/A')}
- **NAICS Code:** {opportunity.get('naicsCode', 'N/A')}
- **Set-Aside:** {opportunity.get('typeOfSetAsideDescription', 'None')}
- **Posted Date:** {opportunity.get('postedDate', 'N/A')}
- **Response Deadline:** {opportunity.get('responseDeadLine', 'N/A')}
- **Description:** {opportunity.get('description', 'No description available')[:2000]}

## Scoring Instructions
Analyze the opportunity and provide a JSON response with:
1. **relevance** (0-100): How well does this match the company's capabilities?
   - **PRIORITY KEYWORDS**: If any priority keywords (🔥) appear in the title/description, significantly boost the score (+10-20 points)
   - **PAST PERFORMANCE**: If past performance keywords match opportunity domain, boost score (+5-15 points)
   - **CLEARANCE**: If opportunity requires clearance and company has it (or higher), boost score (+10 points). If required but not held, reduce score (-20 points)
   - **CONTRACT TYPE**: If opportunity contract type matches preferences, boost score (+5 points)
2. **confidence** (0-100): How confident are you in this assessment?
3. **recommendation**: "bid" (score >= 70), "watch" (50-69), or "skip" (< 50)
4. **reasoning**: 2-3 sentence explanation highlighting priority keyword matches if found
5. **strengths**: List of 1-3 matching factors (mention priority keywords first if matched)
6. **weaknesses**: List of 1-3 concerns or gaps (note clearance gaps if applicable)
7. **key_requirements**: List of 2-4 critical requirements from the opportunity

**BLACKLIST CHECK**: If any blacklist keywords appear in the opportunity title/description, set relevance to 0 and recommendation to "skip".

Respond ONLY with valid JSON:
{{
    "relevance": 75,
    "confidence": 85,
    "recommendation": "bid",
    "reasoning": "Strong match with priority keyword 'AI/ML' and past performance in cloud migration...",
    "strengths": ["Priority keyword match: AI/ML", "NAICS match", "Relevant clearance"],
    "weaknesses": ["Geographic limitation"],
    "key_requirements": ["Active Secret clearance", "5 years AI/ML experience"]
}}"""

    def _parse_ai_response(self, response_text: str) -> Dict[str, Any]:
        """Parse and validate AI response."""
        try:
            # Try to extract JSON from the response
            # Sometimes Claude includes extra text before/after JSON
            text = response_text.strip()

            # Find JSON object boundaries
            start = text.find("{")
            end = text.rfind("}") + 1

            if start >= 0 and end > start:
                json_str = text[start:end]
                data = json.loads(json_str)

                # Validate required fields
                required = ["relevance", "confidence", "recommendation", "reasoning"]
                for field in required:
                    if field not in data:
                        raise ValueError(f"Missing required field: {field}")

                # Clamp values to valid ranges
                data["relevance"] = max(0, min(100, int(data["relevance"])))
                data["confidence"] = max(0, min(100, int(data["confidence"])))

                # Validate recommendation
                if data["recommendation"] not in ["bid", "watch", "skip"]:
                    # Infer from relevance score
                    if data["relevance"] >= 70:
                        data["recommendation"] = "bid"
                    elif data["relevance"] >= 50:
                        data["recommendation"] = "watch"
                    else:
                        data["recommendation"] = "skip"

                # Ensure lists exist
                data.setdefault("strengths", [])
                data.setdefault("weaknesses", [])
                data.setdefault("key_requirements", [])

                return data

        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse AI response: {e}")

        # Return default on parse failure
        return {
            "relevance": 50,
            "confidence": 30,
            "recommendation": "watch",
            "reasoning": "Unable to fully analyze this opportunity.",
            "strengths": [],
            "weaknesses": ["Analysis incomplete"],
            "key_requirements": [],
        }

    def _get_http_client(self) -> httpx.Client:
        """Get or create a reusable HTTP client for Ollama calls."""
        if not hasattr(self, "_http_client") or self._http_client.is_closed:
            self._http_client = httpx.Client(timeout=120.0)
        return self._http_client

    def _call_ollama(self, prompt: str) -> str:
        """Call local Ollama model."""
        try:
            client = self._get_http_client()
            response = client.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.ollama_model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.3,
                        "num_predict": 2000,
                    }
                }
            )
            response.raise_for_status()
            return response.json().get("response", "")
        except Exception as e:
            logger.error(f"Ollama call failed: {e}")
            raise

    def _call_claude(self, prompt: str) -> str:
        """Call Claude API."""
        message = self.client.messages.create(
            model=self.model,
            max_tokens=self.max_tokens,
            messages=[{"role": "user", "content": prompt}],
        )
        for block in message.content:
            text = getattr(block, "text", None)
            if isinstance(text, str):
                return text
        raise ValueError("Claude response did not include text content")

    def score_opportunity(
        self,
        profile: Dict[str, Any],
        opportunity: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Score a single opportunity against company profile.

        Returns opportunity dict with 'score' field added.
        """
        prompt = self._build_scoring_prompt(profile, opportunity)

        try:
            if self.use_local:
                response_text = self._call_ollama(prompt)
            else:
                response_text = self._call_claude(prompt)

            score_data = self._parse_ai_response(response_text)

            # Add score to opportunity
            opportunity["score"] = score_data
            return opportunity

        except Exception as e:
            logger.exception(f"AI scoring error: {e}")
            opportunity["score"] = {
                "relevance": 50,
                "confidence": 0,
                "recommendation": "watch",
                "reasoning": f"Analysis error: {str(e)[:100]}",
                "strengths": [],
                "weaknesses": ["Analysis failed"],
                "key_requirements": [],
            }
            return opportunity

    def score_opportunities(
        self,
        profile: Dict[str, Any],
        opportunities: List[Dict[str, Any]],
        max_to_score: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Score multiple opportunities in parallel.

        Args:
            profile: Company profile
            opportunities: List of opportunities to score
            max_to_score: Maximum number to score (to control API costs)

        Returns:
            List of opportunities with scores added
        """
        # Limit number to score
        to_score = opportunities[:max_to_score]

        logger.info(
            f"Scoring {len(to_score)} opportunities with {_MAX_SCORING_WORKERS} workers"
        )

        # Score in parallel using a thread pool
        scored: List[Dict[str, Any]] = [{}] * len(to_score)  # pre-allocate

        def _score_one(index: int, opp: Dict[str, Any]) -> tuple[int, Dict[str, Any]]:
            logger.info(
                f"Scoring opportunity {index + 1}/{len(to_score)}",
                extra={"notice_id": opp.get("noticeId")},
            )
            return index, self.score_opportunity(profile, opp)

        with ThreadPoolExecutor(max_workers=_MAX_SCORING_WORKERS) as executor:
            futures = {
                executor.submit(_score_one, i, opp): i
                for i, opp in enumerate(to_score)
            }
            for future in as_completed(futures):
                idx, scored_opp = future.result()
                scored[idx] = scored_opp

        # Add remaining without scoring
        for opp in opportunities[max_to_score:]:
            opp["score"] = {
                "relevance": 0,
                "confidence": 0,
                "recommendation": "skip",
                "reasoning": "Not scored due to limit",
                "strengths": [],
                "weaknesses": [],
                "key_requirements": [],
            }
            scored.append(opp)

        return scored
