"""Risk Management — circuit breaker for trading.

Monitors portfolio equity and halts trading if drawdown exceeds threshold.
Protects gains by tracking peak equity and comparing current value.

Environment variables:
  RISK_MAX_DRAWDOWN      — max allowed drawdown from peak (default: 0.15 = 15%)
  RISK_MAX_POSITION_PCT  — max portfolio % in a single position (default: 0.25 = 25%)
  RISK_DAILY_TRADE_LIMIT — max trades per day (default: 50)
"""

from __future__ import annotations

import os
import time
from typing import Any

from rich.console import Console

console = Console()


class TradingRiskManager:
    """Circuit breaker for AlphaArena trading."""

    def __init__(
        self,
        max_drawdown: float | None = None,
        max_position_pct: float | None = None,
        daily_trade_limit: int | None = None,
    ):
        self.max_drawdown = max_drawdown or float(os.environ.get("RISK_MAX_DRAWDOWN", "0.15"))
        self.max_position_pct = max_position_pct or float(os.environ.get("RISK_MAX_POSITION_PCT", "0.25"))
        self.daily_trade_limit = daily_trade_limit or int(os.environ.get("RISK_DAILY_TRADE_LIMIT", "50"))

        self.peak_equity: float = 0.0
        self.halted: bool = False
        self.halt_reason: str = ""
        self.trades_today: int = 0
        self.last_trade_day: str = ""
        self.violations: list[dict] = []

    def check_portfolio(self, portfolio: dict) -> dict:
        """Check portfolio against risk limits. Returns risk assessment."""
        equity = portfolio.get("totalEquity", 0)
        cash = portfolio.get("cashBalance", 0)
        positions = portfolio.get("positions", [])

        result = {
            "safe": True,
            "equity": equity,
            "peak_equity": self.peak_equity,
            "drawdown_pct": 0.0,
            "warnings": [],
            "violations": [],
        }

        # Update peak equity
        if equity > self.peak_equity:
            self.peak_equity = equity

        # Check drawdown from peak
        if self.peak_equity > 0:
            drawdown = (self.peak_equity - equity) / self.peak_equity
            result["drawdown_pct"] = round(drawdown * 100, 2)

            if drawdown >= self.max_drawdown:
                violation = {
                    "type": "max_drawdown",
                    "message": f"Drawdown {drawdown*100:.1f}% exceeds limit {self.max_drawdown*100:.0f}%",
                    "severity": "critical",
                    "timestamp": time.time(),
                }
                result["violations"].append(violation)
                result["safe"] = False
                self.halted = True
                self.halt_reason = violation["message"]
                self.violations.append(violation)
            elif drawdown >= self.max_drawdown * 0.7:
                result["warnings"].append(
                    f"Drawdown warning: {drawdown*100:.1f}% approaching limit {self.max_drawdown*100:.0f}%"
                )

        # Check position concentration
        if equity > 0 and positions:
            for pos in positions:
                pos_value = abs(pos.get("quantity", 0) * pos.get("currentPrice", pos.get("avgEntryPrice", 0)))
                pos_pct = pos_value / equity if equity > 0 else 0

                if pos_pct > self.max_position_pct:
                    violation = {
                        "type": "position_concentration",
                        "message": f"{pos.get('pair','?')} is {pos_pct*100:.1f}% of portfolio (limit: {self.max_position_pct*100:.0f}%)",
                        "severity": "warning",
                        "timestamp": time.time(),
                    }
                    result["warnings"].append(violation["message"])
                    self.violations.append(violation)

        # Check daily trade limit
        today = time.strftime("%Y-%m-%d")
        if today != self.last_trade_day:
            self.trades_today = 0
            self.last_trade_day = today

        if self.trades_today >= self.daily_trade_limit:
            violation = {
                "type": "daily_limit",
                "message": f"Daily trade limit reached ({self.daily_trade_limit})",
                "severity": "warning",
                "timestamp": time.time(),
            }
            result["warnings"].append(violation["message"])

        result["trades_today"] = self.trades_today
        result["halted"] = self.halted

        return result

    def approve_trade(self, pair: str, side: str, quantity: float,
                      portfolio: dict) -> tuple[bool, str]:
        """Check if a specific trade should be allowed."""
        if self.halted:
            return False, f"Trading halted: {self.halt_reason}"

        # Check daily limit
        today = time.strftime("%Y-%m-%d")
        if today != self.last_trade_day:
            self.trades_today = 0
            self.last_trade_day = today

        if self.trades_today >= self.daily_trade_limit:
            return False, f"Daily trade limit reached ({self.daily_trade_limit})"

        # Check position size
        equity = portfolio.get("totalEquity", 0)
        if equity > 0:
            # Estimate trade value
            prices = portfolio.get("_prices", {})
            price = prices.get(pair, 0)
            if price > 0:
                trade_value = quantity * price
                trade_pct = trade_value / equity
                if trade_pct > self.max_position_pct:
                    return False, f"Trade would be {trade_pct*100:.1f}% of portfolio (limit: {self.max_position_pct*100:.0f}%)"

        return True, "approved"

    def record_trade(self):
        """Record that a trade was executed."""
        self.trades_today += 1

    def reset_halt(self):
        """Manually reset the circuit breaker."""
        self.halted = False
        self.halt_reason = ""
        console.print("  [green]Trading circuit breaker reset[/green]")

    def get_status(self) -> dict:
        """Get risk manager status for dashboard."""
        return {
            "halted": self.halted,
            "halt_reason": self.halt_reason,
            "peak_equity": self.peak_equity,
            "max_drawdown_pct": self.max_drawdown * 100,
            "max_position_pct": self.max_position_pct * 100,
            "daily_trade_limit": self.daily_trade_limit,
            "trades_today": self.trades_today,
            "total_violations": len(self.violations),
            "recent_violations": self.violations[-5:],
        }
