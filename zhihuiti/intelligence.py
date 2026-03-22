"""Competitive Intelligence — automated competitor monitoring.

Generates analysis goals that research competitors and market trends.
Designed to run as part of the auto-scheduler rotation.

Environment variables:
  INTELLIGENCE_TARGETS — comma-separated competitor names/URLs to monitor
"""

from __future__ import annotations

import os
import random
from typing import Any


# Default targets (can be overridden via env var)
DEFAULT_TARGETS = [
    "AutoGPT",
    "CrewAI",
    "LangGraph",
    "MetaGPT",
    "OpenAI Swarm",
    "Microsoft AutoGen",
    "Cursor",
    "Windsurf",
    "GitHub Copilot",
    "Lovable",
    "Bolt",
    "Replit Agent",
]

# Intelligence goal templates
GOAL_TEMPLATES = [
    # Competitor analysis
    "Research {target}'s latest features and updates. Compare with our approach in zhihuiti. What can we learn?",
    "Analyze {target}'s pricing model and user growth strategy. How does it compare to our projects?",
    "Check {target}'s GitHub repository for recent commits and stars growth. Summarize what they're building.",

    # Market trends
    "Research the latest trends in AI agent frameworks. Which frameworks are gaining traction and why?",
    "Analyze the current state of autonomous AI trading. What approaches are working in production?",
    "Research how companies are using multi-agent systems in production. What patterns emerge?",
    "Analyze the latest developments in AI-powered code generation. What's changed in the last month?",

    # Crypto/trading intelligence
    "Research the top performing crypto trading strategies used by algorithmic traders. What edge do they have?",
    "Analyze DeFi protocol risks and opportunities. Which protocols are growing fastest?",
    "Research institutional crypto adoption trends. What signals indicate market direction?",
    "Compare AI-powered trading platforms: features, performance, costs. Where is the market heading?",

    # Tech intelligence
    "Research the latest LLM benchmark results. How do DeepSeek, Claude, GPT-4o, and Llama compare?",
    "Analyze the cost trends for AI inference. How are providers competing on price?",
    "Research emerging AI safety frameworks. How are they handling autonomous agent risk?",

    # Product intelligence
    "Research how entertainment review platforms monetize. What works for Rotten Tomatoes, Letterboxd, IMDb?",
    "Analyze the competitive landscape for AI fortune-telling and astrology apps. What features do users value?",
    "Research how paper trading platforms acquire users. What growth strategies work?",
]


def get_targets() -> list[str]:
    """Get competitor monitoring targets from env or defaults."""
    env_targets = os.environ.get("INTELLIGENCE_TARGETS", "")
    if env_targets:
        return [t.strip() for t in env_targets.split(",") if t.strip()]
    return DEFAULT_TARGETS


def generate_intelligence_goal() -> str:
    """Generate a random competitive intelligence goal."""
    template = random.choice(GOAL_TEMPLATES)

    if "{target}" in template:
        targets = get_targets()
        target = random.choice(targets)
        return template.format(target=target)

    return template


def generate_intelligence_report_prompt(findings: list[dict]) -> str:
    """Generate a prompt that synthesizes multiple intelligence findings into a report."""
    findings_text = ""
    for i, f in enumerate(findings, 1):
        goal = f.get("goal", "unknown")
        result = f.get("result", "no result")
        score = f.get("score", 0)
        findings_text += f"\n### Finding {i} (score: {score})\n**Goal:** {goal}\n**Result:** {result}\n"

    return (
        "You are an intelligence analyst. Synthesize these findings into a brief executive summary.\n\n"
        f"## Raw Findings\n{findings_text}\n\n"
        "## Required Output\n"
        "1. **Key Insights** (3-5 bullet points)\n"
        "2. **Threats** (what competitors are doing that could impact us)\n"
        "3. **Opportunities** (gaps we could exploit)\n"
        "4. **Recommended Actions** (specific next steps)\n"
    )


def get_intelligence_goals(count: int = 3) -> list[str]:
    """Get a batch of intelligence goals for the scheduler."""
    goals = []
    used_templates = set()

    while len(goals) < count:
        goal = generate_intelligence_goal()
        # Avoid duplicates
        template_key = goal[:50]
        if template_key not in used_templates:
            goals.append(goal)
            used_templates.add(template_key)

    return goals
