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
