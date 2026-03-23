"""Tests for trading risk management."""

from zhihuiti.risk import TradingRiskManager


class TestTradingRiskManager:
    def test_init_defaults(self):
        rm = TradingRiskManager()
        assert rm.max_drawdown == 0.15
        assert rm.max_position_pct == 0.25
        assert rm.daily_trade_limit == 50
        assert not rm.halted

    def test_check_portfolio_safe(self):
        rm = TradingRiskManager()
        result = rm.check_portfolio({"totalEquity": 100000, "cashBalance": 50000, "positions": []})
        assert result["safe"]
        assert rm.peak_equity == 100000

    def test_peak_equity_tracks(self):
        rm = TradingRiskManager()
        rm.check_portfolio({"totalEquity": 100000, "cashBalance": 50000, "positions": []})
        assert rm.peak_equity == 100000
        rm.check_portfolio({"totalEquity": 120000, "cashBalance": 60000, "positions": []})
        assert rm.peak_equity == 120000
        rm.check_portfolio({"totalEquity": 110000, "cashBalance": 55000, "positions": []})
        assert rm.peak_equity == 120000  # doesn't go down

    def test_drawdown_halts_trading(self):
        rm = TradingRiskManager(max_drawdown=0.15)
        rm.check_portfolio({"totalEquity": 100000, "cashBalance": 50000, "positions": []})
        # 20% drawdown — should halt
        result = rm.check_portfolio({"totalEquity": 80000, "cashBalance": 40000, "positions": []})
        assert not result["safe"]
        assert rm.halted
        assert len(result["violations"]) > 0
        assert result["violations"][0]["type"] == "max_drawdown"

    def test_drawdown_warning(self):
        rm = TradingRiskManager(max_drawdown=0.15)
        rm.check_portfolio({"totalEquity": 100000, "cashBalance": 50000, "positions": []})
        # 12% drawdown — should warn (70% of 15% = 10.5%)
        result = rm.check_portfolio({"totalEquity": 88000, "cashBalance": 44000, "positions": []})
        assert result["safe"]  # not halted yet
        assert len(result["warnings"]) > 0

    def test_position_concentration_warning(self):
        rm = TradingRiskManager(max_position_pct=0.25)
        result = rm.check_portfolio({
            "totalEquity": 100000,
            "cashBalance": 50000,
            "positions": [
                {"pair": "BTC/USD", "quantity": 1, "currentPrice": 85000}  # 85% of portfolio
            ],
        })
        assert len(result["warnings"]) > 0
        assert "BTC/USD" in result["warnings"][0]

    def test_approve_trade_when_halted(self):
        rm = TradingRiskManager()
        rm.halted = True
        rm.halt_reason = "drawdown exceeded"
        ok, reason = rm.approve_trade("BTC/USD", "buy", 0.1, {})
        assert not ok
        assert "halted" in reason

    def test_approve_trade_daily_limit(self):
        rm = TradingRiskManager(daily_trade_limit=3)
        rm.trades_today = 3
        import time
        rm.last_trade_day = time.strftime("%Y-%m-%d")
        ok, reason = rm.approve_trade("BTC/USD", "buy", 0.1, {"totalEquity": 100000})
        assert not ok
        assert "limit" in reason

    def test_record_trade(self):
        rm = TradingRiskManager()
        assert rm.trades_today == 0
        rm.record_trade()
        assert rm.trades_today == 1

    def test_reset_halt(self):
        rm = TradingRiskManager()
        rm.halted = True
        rm.halt_reason = "test"
        rm.reset_halt()
        assert not rm.halted
        assert rm.halt_reason == ""

    def test_get_status(self):
        rm = TradingRiskManager()
        rm.check_portfolio({"totalEquity": 100000, "cashBalance": 50000, "positions": []})
        status = rm.get_status()
        assert status["peak_equity"] == 100000
        assert status["max_drawdown_pct"] == 15.0
        assert not status["halted"]

    def test_custom_thresholds(self):
        rm = TradingRiskManager(max_drawdown=0.10, max_position_pct=0.20, daily_trade_limit=10)
        assert rm.max_drawdown == 0.10
        assert rm.max_position_pct == 0.20
        assert rm.daily_trade_limit == 10
