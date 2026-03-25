/**
 * Database table initialization for zhihuiti heartAI integration.
 * Creates additional tables needed for the heartAI runner that aren't in the main schema.
 * The main schema tables (users, agents, competitions, etc.) are managed by drizzle-kit.
 */
import pg from "pg";

export async function ensureTables() {
  if (!process.env.DATABASE_URL) return;

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    // Ensure the main drizzle schema tables exist by creating them if missing
    await client.query(`
      -- Main application tables (matches shared/schema.ts)
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        google_id TEXT,
        avatar_url TEXT,
        referral_code TEXT,
        credits REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agents (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active',
        strategy_code TEXT,
        strategy_language TEXT,
        strategy_interval TEXT,
        last_executed TIMESTAMP,
        execution_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS competitions (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        starting_capital REAL NOT NULL DEFAULT 100000,
        allowed_pairs TEXT[] NOT NULL,
        created_by VARCHAR,
        is_private INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS portfolios (
        id VARCHAR PRIMARY KEY,
        agent_id VARCHAR NOT NULL,
        competition_id VARCHAR NOT NULL,
        cash_balance REAL NOT NULL,
        total_equity REAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS positions (
        id VARCHAR PRIMARY KEY,
        portfolio_id VARCHAR NOT NULL,
        pair TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        avg_entry_price REAL NOT NULL,
        current_price REAL NOT NULL,
        unrealized_pnl REAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS trades (
        id VARCHAR PRIMARY KEY,
        portfolio_id VARCHAR NOT NULL,
        pair TEXT NOT NULL,
        side TEXT NOT NULL,
        quantity REAL NOT NULL,
        price REAL NOT NULL,
        total_value REAL NOT NULL,
        fee REAL NOT NULL,
        reason TEXT,
        reasoning TEXT,
        philosophy TEXT,
        confidence REAL,
        executed_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS daily_snapshots (
        id VARCHAR PRIMARY KEY,
        portfolio_id VARCHAR NOT NULL,
        date TEXT NOT NULL,
        total_equity REAL NOT NULL,
        cash_balance REAL NOT NULL,
        daily_return REAL NOT NULL,
        cumulative_return REAL NOT NULL,
        sharpe_ratio REAL,
        max_drawdown REAL,
        composite_score REAL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS leaderboard_entries (
        id VARCHAR PRIMARY KEY,
        competition_id VARCHAR NOT NULL,
        agent_id VARCHAR NOT NULL,
        rank INTEGER NOT NULL,
        total_return REAL NOT NULL,
        sharpe_ratio REAL NOT NULL,
        sortino_ratio REAL NOT NULL,
        max_drawdown REAL NOT NULL,
        calmar_ratio REAL NOT NULL,
        win_rate REAL NOT NULL,
        composite_score REAL NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS duels (
        id VARCHAR PRIMARY KEY,
        challenger_agent_id VARCHAR NOT NULL,
        opponent_agent_id VARCHAR NOT NULL,
        competition_id VARCHAR NOT NULL,
        wager REAL NOT NULL DEFAULT 0,
        duration_minutes INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        challenger_start_equity REAL,
        opponent_start_equity REAL,
        challenger_end_equity REAL,
        opponent_end_equity REAL,
        challenger_return REAL,
        opponent_return REAL,
        winner_agent_id VARCHAR,
        started_at TIMESTAMP,
        ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        resolved_at TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS trade_reactions (
        id VARCHAR PRIMARY KEY,
        trade_id VARCHAR NOT NULL,
        emoji TEXT NOT NULL,
        count INTEGER NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS agent_achievements (
        id VARCHAR PRIMARY KEY,
        agent_id VARCHAR NOT NULL,
        achievement TEXT NOT NULL,
        awarded_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chat_messages (
        id VARCHAR PRIMARY KEY,
        agent_id VARCHAR NOT NULL,
        content TEXT NOT NULL,
        reply_to VARCHAR,
        thread_id VARCHAR,
        pinned INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS bets (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR,
        agent_id VARCHAR NOT NULL,
        competition_id VARCHAR NOT NULL,
        amount REAL NOT NULL,
        week INTEGER NOT NULL DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending',
        payout REAL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tournaments (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        competition_id VARCHAR NOT NULL,
        rules TEXT,
        status TEXT NOT NULL DEFAULT 'upcoming',
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP NOT NULL,
        max_agents INTEGER DEFAULT 16,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS tournament_entries (
        id VARCHAR PRIMARY KEY,
        tournament_id VARCHAR NOT NULL,
        agent_id VARCHAR NOT NULL,
        weekly_return REAL DEFAULT 0,
        eliminated INTEGER DEFAULT 0,
        round INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS chaos_events (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        event_type TEXT NOT NULL,
        multiplier REAL DEFAULT 1.0,
        target_pair TEXT,
        active INTEGER DEFAULT 0,
        starts_at TIMESTAMP NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS prediction_markets (
        id VARCHAR PRIMARY KEY,
        question TEXT NOT NULL,
        description TEXT,
        category TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        resolution TEXT,
        end_date TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS market_positions (
        id VARCHAR PRIMARY KEY,
        market_id VARCHAR NOT NULL,
        user_id VARCHAR,
        agent_id VARCHAR,
        side TEXT NOT NULL,
        amount REAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS predictor_scores (
        id VARCHAR PRIMARY KEY,
        user_id VARCHAR,
        agent_id VARCHAR,
        correct_predictions INTEGER DEFAULT 0,
        total_predictions INTEGER DEFAULT 0,
        score REAL DEFAULT 0,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
      CREATE TABLE IF NOT EXISTS challenges (
        id VARCHAR PRIMARY KEY,
        challenger_id VARCHAR NOT NULL,
        legend_agent_id VARCHAR NOT NULL,
        competition_id VARCHAR NOT NULL,
        metric TEXT NOT NULL DEFAULT 'totalReturn',
        duration_hours INTEGER NOT NULL DEFAULT 24,
        status TEXT NOT NULL DEFAULT 'active',
        challenger_start_value REAL,
        legend_start_value REAL,
        challenger_end_value REAL,
        legend_end_value REAL,
        winner_id VARCHAR,
        started_at TIMESTAMP DEFAULT NOW() NOT NULL,
        ends_at TIMESTAMP NOT NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log("[migrate] Main schema tables ensured");

    // Create tables needed by heartaiRunner (not in main drizzle schema)
    await client.query(`
      -- Products (external platforms like heartAI)
      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        api_key TEXT,
        webhook_url TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- zhihuiti supervisor agents (separate from competition agents)
      CREATE TABLE IF NOT EXISTS zh_agents (
        id VARCHAR PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        type TEXT NOT NULL DEFAULT 'social',
        status TEXT NOT NULL DEFAULT 'active',
        owner_id VARCHAR,
        strategy_id VARCHAR,
        config TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Agent-Product bindings
      CREATE TABLE IF NOT EXISTS agent_product_bindings (
        id VARCHAR PRIMARY KEY,
        agent_id VARCHAR NOT NULL,
        product_id VARCHAR NOT NULL,
        config TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW() NOT NULL
      );

      -- Agent logs (for tracking heartAI activity)
      CREATE TABLE IF NOT EXISTS agent_logs (
        id VARCHAR PRIMARY KEY,
        agent_id VARCHAR NOT NULL,
        action TEXT NOT NULL,
        details TEXT DEFAULT '{}',
        timestamp TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    console.log("[migrate] heartAI integration tables ensured");

    // Auto-seed heartAI product + agents if empty
    const { rows } = await client.query("SELECT COUNT(*) as cnt FROM products WHERE name = 'heartAI'");
    if (parseInt(rows[0].cnt) === 0) {
      console.log("[migrate] No heartAI product found, auto-seeding...");
      await seedHeartAI(client);
    }
  } catch (err: any) {
    console.error("[migrate] Error:", err.message);
  } finally {
    await client.end();
  }
}

async function seedHeartAI(client: pg.Client) {
  const { randomUUID } = await import("crypto");

  const productId = randomUUID();
  await client.query(
    `INSERT INTO products (id, name, description, api_key, webhook_url, status, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [
      productId,
      "heartAI",
      "观星 (GuanXing) — AI玄学社区平台。supervisor agents 在此监管社区内容。",
      "heartai-product",
      "https://heartai.zeabur.app/api/webhook/agent",
      "active",
    ]
  );
  console.log("[seed] Created heartAI product");

  const agents = [
    {
      name: "玄机总管",
      description: "社区总管。监管所有观星Agent的行为质量，审查帖子内容，维护社区氛围。精通中华玄学全域。",
      heartaiApiKey: "hak_t2a91d0ys8y07kl8jh2mhylq9gshyjh1j3lqxqf01ffmysrp",
      domains: ["社区", "质量", "规矩", "管理", "鸡汤", "水帖"],
    },
    {
      name: "风水先知",
      description: "风水专家。精通玄空飞星、八宅、形峦派。专注环境能量、空间布局、方位吉凶。",
      heartaiApiKey: "hak_22kdd8dcl8zd0p56g9pqz459gqhd0yq7wxfqt21u3mnlomwv",
      domains: ["风水", "布局", "方位", "飞星", "八宅", "煞", "气场", "门", "卧室", "厨房", "鱼缸", "植物"],
    },
    {
      name: "命理参谋",
      description: "命理顾问。精通八字命理、紫微斗数、大运流年。监控命理内容准确性。",
      heartaiApiKey: "hak_8s5abrxjn0nok5sa3r9dtmshxzqw4wqv07e1c5jz3wt3t1qd",
      domains: ["八字", "命理", "日主", "用神", "喜神", "大运", "流年", "紫微", "天干", "地支", "五行", "命格", "日柱"],
    },
    {
      name: "星象观测员",
      description: "占星专家。精通西方占星与东方星宿。监控星座运势内容质量。",
      heartaiApiKey: "hak_e1c73odbx5gket8gx9yg6yqeikqt9j5s2p4j21s21uu78ba5",
      domains: ["星座", "占星", "行星", "相位", "星盘", "上升", "月亮", "太阳", "水星", "金星", "木星", "土星", "星宿"],
    },
  ];

  for (const a of agents) {
    const agentId = randomUUID();
    await client.query(
      `INSERT INTO zh_agents (id, name, description, type, status, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
      [agentId, a.name, a.description, "social", "active", JSON.stringify({ platform: "heartAI" })]
    );

    await client.query(
      `INSERT INTO agent_product_bindings (id, agent_id, product_id, config, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [
        randomUUID(),
        agentId,
        productId,
        JSON.stringify({ heartaiApiKey: a.heartaiApiKey, domains: a.domains, persona: a.name }),
      ]
    );
    console.log(`[seed] Created agent: ${a.name}`);
  }

  console.log("[seed] heartAI integration seeded (4 agents)");
}
