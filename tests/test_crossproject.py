"""Tests for cross-project dashboard and competitive intelligence."""

from __future__ import annotations

import pytest
from unittest.mock import patch, MagicMock

from zhihuiti.crossproject import gather_all, gather_alphaarena, gather_criticai, gather_heartai
from zhihuiti.intelligence import generate_intelligence_goal, get_intelligence_goals, get_targets


class TestCrossProject:
    @patch("zhihuiti.crossproject._safe_get")
    def test_gather_alphaarena_live(self, mock_get):
        mock_get.side_effect = [
            {"prices": [{"pair": "BTC/USD", "price": 85000, "change24h": 2.5}]},
            {"cashBalance": 90000, "totalEquity": 120000, "positions": [{"pair": "BTC/USD"}]},
            [{"agentId": "agent-zhihuiti", "rank": 5, "totalReturn": 0.8, "sharpeRatio": 3.0,
              "winRate": 0.6, "compositeScore": 0.7, "agent": {"name": "ZhihuiTi Evolution"}}],
        ]
        data = gather_alphaarena()
        assert data["status"] == "live"
        assert data["metrics"]["pairs"] == 1
        assert data["metrics"]["equity"] == 120000
        assert data["metrics"]["best_rank"] == 5

    @patch("zhihuiti.crossproject._safe_get")
    def test_gather_alphaarena_offline(self, mock_get):
        mock_get.return_value = {"error": "connection refused"}
        data = gather_alphaarena()
        assert data["status"] == "offline"

    @patch("zhihuiti.crossproject._safe_get")
    def test_gather_criticai_live(self, mock_get):
        mock_get.side_effect = [
            [{"id": 1, "type": "review"}],
            [{"id": "agent-1", "name": "Critic"}],
            [{"name": "TopCritic", "score": 95}],
        ]
        data = gather_criticai()
        assert data["status"] == "live"
        assert data["metrics"]["recent_activities"] == 1

    @patch("zhihuiti.crossproject._safe_get")
    def test_gather_heartai_live(self, mock_get):
        mock_get.return_value = {"status": "ok", "uptime": "24h"}
        data = gather_heartai()
        assert data["status"] == "live"

    @patch("zhihuiti.crossproject._safe_get")
    def test_gather_all(self, mock_get):
        mock_get.return_value = {"error": "offline"}
        data = gather_all({"agents": [{"id": "a1"}], "memory": {"total_tasks": 5},
                           "bloodline": {"total_genes": 2}, "economy": {"money_supply": 9000},
                           "inspection": {"avg_score": 0.8}})
        assert "projects" in data
        assert "summary" in data
        assert data["projects"]["zhihuiti"]["metrics"]["agents"] == 1


class TestIntelligence:
    def test_generate_goal(self):
        goal = generate_intelligence_goal()
        assert len(goal) > 10
        assert isinstance(goal, str)

    def test_get_goals_unique(self):
        goals = get_intelligence_goals(5)
        assert len(goals) == 5
        assert len(set(g[:50] for g in goals)) == 5

    def test_get_targets(self):
        targets = get_targets()
        assert len(targets) > 0
        assert "AutoGPT" in targets

    @patch.dict("os.environ", {"INTELLIGENCE_TARGETS": "CompA,CompB,CompC"})
    def test_custom_targets(self):
        targets = get_targets()
        assert targets == ["CompA", "CompB", "CompC"]
