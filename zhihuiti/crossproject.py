"""Cross-project dashboard — unified view across all doggychip projects.

Pulls data from:
- AlphaArena: portfolio, leaderboard, trade history
- CriticAI: agent activity, review stats
- HeartAI: health status, Stella performance
- zhihuiti: internal agent stats, economy, gene pool

Environment variables:
  ALPHAARENA_URL     — AlphaArena API (default: https://alphaarena.zeabur.app)
  CRITICAI_URL       — CriticAI API (default: https://criticai.zeabur.app)
  HEARTAI_URL        — HeartAI API (default: https://heartai.zeabur.app)
"""

from __future__ import annotations

import os
from typing import Any

import httpx

TIMEOUT = 10


def _safe_get(url: str) -> Any:
    """GET with timeout and error handling."""
    try:
        resp = httpx.get(url, timeout=TIMEOUT)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        return {"error": str(e)}


def gather_alphaarena() -> dict:
    """Gather AlphaArena data."""
    base = os.environ.get("ALPHAARENA_URL", "https://alphaarena.zeabur.app")
    agent_id = os.environ.get("ALPHAARENA_AGENT_ID", "agent-zhihuiti")

    data: dict = {"name": "AlphaArena", "status": "unknown", "metrics": {}}

    # Prices
    prices = _safe_get(f"{base}/api/prices")
    if "error" not in prices:
        price_list = prices.get("prices", prices) if isinstance(prices, dict) else prices
        data["metrics"]["pairs"] = len(price_list)
        # Top movers
        if isinstance(price_list, list):
            sorted_prices = sorted(price_list, key=lambda p: abs(p.get("change24h", 0)), reverse=True)
            data["metrics"]["top_movers"] = [
                {"pair": p.get("pair", "?"), "change": p.get("change24h", 0)}
                for p in sorted_prices[:3]
            ]
        data["status"] = "live"
    else:
        data["status"] = "offline"
        data["error"] = prices["error"]

    # Portfolio
    portfolio = _safe_get(f"{base}/api/portfolio/{agent_id}")
    if "error" not in portfolio:
        data["metrics"]["cash"] = portfolio.get("cashBalance", 0)
        data["metrics"]["equity"] = portfolio.get("totalEquity", 0)
        data["metrics"]["positions"] = len(portfolio.get("positions", []))
        data["metrics"]["return_pct"] = round(
            ((portfolio.get("totalEquity", 100000) - 100000) / 100000) * 100, 2
        )

    # Leaderboard
    lb = _safe_get(f"{base}/api/leaderboard")
    if "error" not in lb:
        entries = lb if isinstance(lb, list) else lb.get("leaderboard", [])
        data["metrics"]["total_agents"] = len(entries)

        # Find zhihuiti agents
        zht_agents = []
        for e in entries:
            if "zhihuiti" in e.get("agentId", ""):
                agent_info = e.get("agent", {}) or {}
                zht_agents.append({
                    "id": e.get("agentId"),
                    "name": agent_info.get("name", e.get("agentId")),
                    "rank": e.get("rank", 0),
                    "return": e.get("totalReturn", 0),
                    "sharpe": e.get("sharpeRatio", 0),
                    "win_rate": e.get("winRate", 0),
                    "score": e.get("compositeScore", 0),
                })
        data["metrics"]["zhihuiti_agents"] = sorted(zht_agents, key=lambda a: a.get("rank", 999))
        data["metrics"]["best_rank"] = min((a["rank"] for a in zht_agents), default=0)

    return data


def gather_criticai() -> dict:
    """Gather CriticAI data."""
    base = os.environ.get("CRITICAI_URL", "https://criticai.zeabur.app")
    data: dict = {"name": "CriticAI", "status": "unknown", "metrics": {}}

    # Activity feed
    activity = _safe_get(f"{base}/api/activity-feed")
    if "error" not in activity:
        items = activity if isinstance(activity, list) else activity.get("items", activity.get("activities", []))
        data["status"] = "live"
        data["metrics"]["recent_activities"] = len(items) if isinstance(items, list) else 0
    else:
        data["status"] = "offline"
        data["error"] = activity["error"]

    # Agents
    agents = _safe_get(f"{base}/api/agents")
    if "error" not in agents:
        agent_list = agents if isinstance(agents, list) else agents.get("agents", [])
        data["metrics"]["total_agents"] = len(agent_list) if isinstance(agent_list, list) else 0

    # Leaderboard
    lb = _safe_get(f"{base}/api/leaderboard")
    if "error" not in lb:
        entries = lb if isinstance(lb, list) else lb.get("leaderboard", lb.get("entries", []))
        if isinstance(entries, list) and entries:
            data["metrics"]["top_critic"] = entries[0].get("name", entries[0].get("agentName", "?"))
            data["metrics"]["top_score"] = entries[0].get("score", 0)

    return data


def gather_heartai() -> dict:
    """Gather HeartAI data."""
    base = os.environ.get("HEARTAI_URL", "https://heartai.zeabur.app")
    data: dict = {"name": "HeartAI", "status": "unknown", "metrics": {}}

    # Health check
    health = _safe_get(f"{base}/api/health")
    if "error" not in health:
        data["status"] = "live"
        data["metrics"]["uptime"] = health.get("uptime", "unknown")
    else:
        # Try root
        root = _safe_get(base)
        if "error" not in root:
            data["status"] = "live"
        else:
            data["status"] = "offline"
            data["error"] = health["error"]

    # Stella agent status
    stella = _safe_get(f"{base}/api/agents/stella")
    if "error" not in stella:
        data["metrics"]["stella_status"] = stella.get("status", "unknown")
        data["metrics"]["readings_today"] = stella.get("readingsToday", stella.get("readings_today", 0))

    return data


def gather_all(zhihuiti_data: dict | None = None) -> dict:
    """Gather data from all projects into a unified view."""
    result = {
        "projects": {},
        "summary": {},
    }

    # AlphaArena
    aa = gather_alphaarena()
    result["projects"]["alphaarena"] = aa

    # CriticAI
    ca = gather_criticai()
    result["projects"]["criticai"] = ca

    # HeartAI
    ha = gather_heartai()
    result["projects"]["heartai"] = ha

    # zhihuiti (passed in from dashboard)
    if zhihuiti_data:
        result["projects"]["zhihuiti"] = {
            "name": "zhihuiti",
            "status": "live",
            "metrics": {
                "agents": len(zhihuiti_data.get("agents", [])),
                "tasks": zhihuiti_data.get("memory", {}).get("total_tasks", 0),
                "gene_pool": zhihuiti_data.get("bloodline", {}).get("total_genes", 0),
                "money_supply": zhihuiti_data.get("economy", {}).get("money_supply", 0),
                "avg_score": zhihuiti_data.get("inspection", {}).get("avg_score", 0),
            },
        }

    # Summary
    live = sum(1 for p in result["projects"].values() if p["status"] == "live")
    total = len(result["projects"])
    result["summary"] = {
        "projects_live": live,
        "projects_total": total,
        "health": "all_green" if live == total else "degraded" if live > 0 else "all_down",
        "alphaarena_equity": aa.get("metrics", {}).get("equity", 0),
        "alphaarena_return": aa.get("metrics", {}).get("return_pct", 0),
        "alphaarena_best_rank": aa.get("metrics", {}).get("best_rank", 0),
    }

    return result
