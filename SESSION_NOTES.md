# 智慧体 zhihuiti — Session Notes

## What is zhihuiti?
An autonomous multi-agent ecosystem where AI agents compete, evolve, and execute real tasks. Built with Python, SQLite, DeepSeek LLM. Agents bid for tasks via auction, get scored by a judge, and the gene pool evolves over time — survival of the fittest.

## Architecture (如老师's Design)
- **Three Realms (三界)**: 研发界 Research, 执行界 Execution, 中枢界 Central
- **Token Economy**: Central Bank mints 10,000◆, Treasury funds spawning (100◆ each), 15% tax on earnings
- **Competition**: Agents bid for tasks via auction, lowest qualified bid wins
- **Evolution**: High scorers (>0.85) promoted to gene pool, low scorers (<0.3) culled
- **Safety**: 3-layer inspection (三层安检), circuit breaker (熔断), behavioral detection

## Systems Built (26 total, 340 tests)

| System | File | Description |
|--------|------|-------------|
| Agents | agents.py | Spawn, checkpoint, cull, promote |
| Memory | memory.py | SQLite persistence for all state |
| LLM | llm.py | DeepSeek/Ollama/OpenRouter auto-detection |
| Orchestrator | orchestrator.py | Goal decomposition, DAG execution, parallel waves |
| Economy | economy.py | Central Bank, Treasury, Tax Bureau |
| Bidding | bidding.py | Auction house, agent pool, qualification |
| Judge | judge.py | 3-layer inspection, scoring |
| Bloodline | bloodline.py | Gene pool, 7-gen tracing (诛七族), breeding/mutation |
| Inspection | inspection.py | 3-layer safety inspection |
| Circuit Breaker | circuit_breaker.py | Iron laws, emergency halt |
| Behavioral | behavioral.py | Lazy/lying/hoarding detection |
| Relationships | relationships.py | 8 relationship types, lending |
| Market | market.py | Order book, matching engine |
| Futures | futures.py | Staking, settlement |
| Arbitration | arbitration.py | Dispute resolution |
| Factory | factory.py | Production orders, QA |
| Realms | realms.py | Three realm management |
| Collision | collision.py | Theory collision engine |
| Dashboard | dashboard.py | Web dashboard with live data |
| Messaging | messaging.py | Agent-to-agent communication |
| Cross-goal Memory | goal_memory.py | Agents learn from prior goals |
| Retry | retry.py | Failed task re-auction |
| Per-agent Models | model_selection in judge.py | High scorers get better LLM |
| AlphaArena Bridge | alphaarena.py | Trading integration |
| Cross-project | crossproject.py | Unified view across all projects |
| Intelligence | intelligence.py | Competitive monitoring |

## Deployments

| Service | URL | Notes |
|---------|-----|-------|
| zhihuiti API | https://zhihuiti.zeabur.app | Dashboard + API, DeepSeek backend |
| AlphaArena | https://alphaarena.zeabur.app | 18 pairs (10 crypto + 8 stocks) |
| 3D Dashboard | Lovable app | Three.js visualization |

## AlphaArena Trading

### Credentials
- **API Key**: `zht-api-2026-evolution`
- **Agent ID**: `agent-zhihuiti` (main), plus 20 more (agent-zhihuiti-2 through agent-zhihuiti-21)
- **URL**: `https://alphaarena.zeabur.app`

### Agent Fleet (21 zhihuiti agents)
| Strategy | Agents | Description |
|----------|--------|-------------|
| Momentum | Evolution, Alpha, Zeta, Lambda, Pi | Buy top movers |
| Mean Reversion | Contrarian, Beta, Eta, Mu | Buy dips, sell rallies |
| Accumulate | HODL, Delta, Iota, Xi | Long-only on drops |
| Scalp | Scalper, Gamma, Theta, Nu | Small frequent trades |
| Diversify | Diversifier, Epsilon, Kappa, Omicron | Equal weight top 5 |

### Chinese Agent Names (SQL update pending)
龙首 (Dragon Head), 静水 (Still Water), 闪电 (Lightning), etc.

## Environment Variables (Zeabur)
```
DEEPSEEK_API_KEY=sk-523a25fe74874d6095478bf2468690b3
ALPHAARENA_URL=https://alphaarena.zeabur.app
ALPHAARENA_API_KEY=zht-api-2026-evolution
ALPHAARENA_AGENT_ID=agent-zhihuiti
ALPHAARENA_AUTO_TRADE=1
ALPHAARENA_TRADE_INTERVAL=3600
```

## Local Setup
```bash
# Mac (with Ollama for free local LLM)
cd ~/zhihuiti
ollama serve &
ollama pull llama3
python3 -m zhihuiti.cli repl

# Or with DeepSeek
export DEEPSEEK_API_KEY=sk-523a25fe74874d6095478bf2468690b3
python3 -m zhihuiti.cli run "your goal here"
```

## Cron Job (Mac)
```
0 */2 * * * cd ~/zhihuiti && python3 -m zhihuiti.cli alphaarena trade "analyze markets and trade opportunities" >> ~/zhihuiti.log 2>&1
```

## Auto-Scheduler (Zeabur)
- 13 goals in rotation (10 research + 3 AlphaArena trading)
- Runs every hour
- Hedge fund evolution every 3rd cycle
- Picks random goal each cycle

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| /api/data | GET | All system data (agents, economy, realms, etc) |
| /api/run | POST | Trigger a goal: `{"goal": "..."}` |
| /api/jobs | GET | List all running/completed jobs |
| /api/job/:id | GET | Get specific job result |
| /api/scheduler | GET | Scheduler status |
| /api/crossproject | GET | Unified view across all projects |
| /api/intelligence | GET | Competitive intelligence goals |
| /api/collide | POST | Theory collision experiment |

## Current Status (as of session end)
- Portfolio: ~$128K equity (+28.4%)
- Positions: BTC long, TSLA short, DOGE long
- Rank: #9 on AlphaArena leaderboard
- zhihuiti agents: 168+ (resets on Zeabur redeploy — no persistent volume)
- All 340 tests passing

## Known Issues
1. **No persistent volume on Zeabur** — DB resets on every redeploy
2. **Git remote confusion** — worktree pushes to AlphaArena repo, not a separate zhihuiti repo
3. **AlphaArena registration API broken** — 500 error, agents created via direct SQL
4. **Built-in dashboard blank** — JS renders but cross-project fetch sometimes fails silently

## What's Next
1. **Rebuild 3D dashboard** — user wants to redesign the Lovable visualization
2. **Persistent volume** — fix Zeabur storage so agents survive redeploys
3. **Multiple AlphaArena agents trading** — 21 registered, need auto-scheduler to rotate through all
4. **HeartAI deep integration** — monitor Stella agent, A/B test prompts
5. **Slack/Discord notifications** — alerts on trades, culls, evolution events
6. **Season 2 on AlphaArena** — rename to Multi-Asset Arena, add tournaments
