"""Tests for quick-search top-10 ranking and task limits."""
from types import SimpleNamespace

import app.tasks.scoring_tasks as scoring_tasks
from app.config import settings
from app.tasks.scoring_tasks import score_opportunities_task, select_top_matches


def _opp(notice_id: str, relevance: int, confidence: int = 0) -> dict:
    return {
        "noticeId": notice_id,
        "title": f"Opportunity {notice_id}",
        "score": {
            "relevance": relevance,
            "confidence": confidence,
        },
    }


def test_select_top_matches_returns_exactly_10_when_more_available():
    opportunities = [_opp(f"id-{i:02d}", relevance=100 - i) for i in range(20)]

    top = select_top_matches(opportunities, 10)

    assert len(top) == 10
    assert [item["noticeId"] for item in top] == [f"id-{i:02d}" for i in range(10)]


def test_select_top_matches_returns_all_when_fewer_than_limit():
    opportunities = [_opp("id-a", 10), _opp("id-b", 5), _opp("id-c", 2)]

    top = select_top_matches(opportunities, 10)

    assert len(top) == 3
    assert [item["noticeId"] for item in top] == ["id-a", "id-b", "id-c"]


def test_select_top_matches_includes_low_scores_without_threshold():
    opportunities = [_opp(f"id-{i:02d}", relevance=9 - i) for i in range(10)]

    top = select_top_matches(opportunities, 10)

    assert len(top) == 10
    assert all(item["score"]["relevance"] < 50 for item in top)
    assert top[0]["score"]["relevance"] == 9
    assert top[-1]["score"]["relevance"] == 0


def test_select_top_matches_uses_deterministic_tiebreak():
    opportunities = [
        _opp("id-c", relevance=70, confidence=40),
        _opp("id-a", relevance=70, confidence=40),
        _opp("id-b", relevance=70, confidence=40),
    ]

    top = select_top_matches(opportunities, 10)

    assert [item["noticeId"] for item in top] == ["id-a", "id-b", "id-c"]


def test_task_uses_configured_candidate_cap(monkeypatch):
    class DummyResult:
        def __init__(self, value):
            self.value = value

        def scalar_one(self):
            return self.value

    class DummyDB:
        def __init__(self):
            self.user = SimpleNamespace(sam_api_key_encrypted="ciphertext")
            self.profile = SimpleNamespace(
                company_name="Acme",
                primary_naics="541511",
                secondary_naics=[],
                core_competencies=["Services"],
                technical_skills=[],
                certifications=[],
                service_area=[],
                target_contract_min=0,
                target_contract_max=1_000_000,
                blacklist_keywords=[],
                past_performance_keywords=[],
                priority_keywords=[],
                clearance_level="None",
                contract_types_preference=[],
                open_to_subcontracting=True,
                open_to_prime_contracting=True,
                cage_code=None,
                uei_number=None,
                duns_number=None,
            )
            self.search_history = SimpleNamespace(
                total_results=0,
                high_relevance_count=0,
                medium_relevance_count=0,
                low_relevance_count=0,
                job_status="pending",
                cached_results=None,
            )
            self.calls = 0

        def execute(self, _query):
            self.calls += 1
            if self.calls == 1:
                return DummyResult(self.user)
            if self.calls == 2:
                return DummyResult(self.profile)
            return DummyResult(self.search_history)

        def commit(self):
            return None

        def close(self):
            return None

    class DummySAMClient:
        def __init__(self, _api_key):
            pass

        async def search_for_profile(self, _profile, days_back=30):
            return {
                "totalRecords": 15,
                "opportunitiesData": [{"noticeId": f"id-{i:02d}"} for i in range(15)],
            }

        async def close(self):
            return None

    observed_max_to_score = {"value": None}

    class DummyAIScorer:
        def score_opportunities(self, _profile, opportunities, max_to_score=50):
            observed_max_to_score["value"] = max_to_score
            scored = []
            for idx, opp in enumerate(opportunities):
                scored.append(
                    {
                        **opp,
                        "score": {
                            "relevance": 100 - idx,
                            "confidence": 50,
                            "recommendation": "watch",
                            "reasoning": "ok",
                            "strengths": [],
                            "weaknesses": [],
                            "key_requirements": [],
                        },
                    }
                )
            return scored

    original_candidate_limit = settings.AI_SCORING_CANDIDATE_LIMIT
    original_result_limit = settings.QUICK_SEARCH_RESULT_LIMIT
    settings.AI_SCORING_CANDIDATE_LIMIT = 100
    settings.QUICK_SEARCH_RESULT_LIMIT = 10

    monkeypatch.setattr(scoring_tasks, "SyncSession", lambda: DummyDB())
    monkeypatch.setattr(scoring_tasks, "SAMClient", DummySAMClient)
    monkeypatch.setattr(scoring_tasks, "AIScorer", DummyAIScorer)
    monkeypatch.setattr(
        scoring_tasks.encryption,
        "decrypt",
        lambda _value: "sam-api-key",
    )
    monkeypatch.setattr(score_opportunities_task, "update_state", lambda *args, **kwargs: None)

    try:
        result = score_opportunities_task.run(
            user_id="user-1",
            profile_id="profile-1",
            search_history_id="search-1",
            days_back=30,
        )
    finally:
        settings.AI_SCORING_CANDIDATE_LIMIT = original_candidate_limit
        settings.QUICK_SEARCH_RESULT_LIMIT = original_result_limit

    assert observed_max_to_score["value"] == 100
    assert len(result["opportunities"]) == 10


def test_scoring_task_retries_sam_client_errors():
    assert scoring_tasks.SAMClientError in score_opportunities_task.autoretry_for
    assert score_opportunities_task.retry_backoff is True
    assert score_opportunities_task.max_retries == 2
