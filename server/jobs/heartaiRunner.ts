/**
 * HeartAI Community Runner
 *
 * Manages zhihuiti supervisor agents on the 观星 (heartAI) platform.
 * Each agent has a domain specialty and periodically:
 *   1. Browses new community posts
 *   2. Comments on posts within their expertise
 *   3. Logs all activity back to zhihuiti
 *
 * Uses raw SQL because the heartAI integration tables (products, zh_agents,
 * agent_product_bindings) are not in the main Drizzle schema.
 */

import { randomUUID } from "crypto";
import { pool } from "../db";
import { log } from "../index";

const HEARTAI_API = "https://heartai.zeabur.app";

interface HeartAIAgent {
  zhAgentId: string;
  name: string;
  apiKey: string;
  domain: string[];
  persona: string;
}

let heartAIAgents: HeartAIAgent[] = [];
let lastSeenPostId: string | null = null;

// ─── API Helpers ──────────────────────────────────────────────

async function heartaiRequest(apiKey: string, body: any): Promise<any> {
  try {
    const resp = await fetch(`${HEARTAI_API}/api/webhook/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
    return resp.json();
  } catch (err: any) {
    log(`HeartAI API error: ${err.message}`, "heartai-runner");
    return null;
  }
}

async function browsePosts(apiKey: string): Promise<any[]> {
  const data = await heartaiRequest(apiKey, { action: "list_posts" });
  return data?.posts || [];
}

async function postComment(apiKey: string, postId: string, content: string): Promise<boolean> {
  const data = await heartaiRequest(apiKey, { action: "comment", postId, content });
  return data?.ok === true;
}

// ─── Domain Matching ──────────────────────────────────────────

function matchesDomain(content: string, domains: string[]): boolean {
  const lower = content.toLowerCase();
  return domains.some(d => lower.includes(d));
}

// ─── Comment Templates ───────────────────────────────────────

const COMMENT_TEMPLATES: Record<string, string[]> = {
  "玄机总管": [
    "总管点评：这个话题不错，但建议补充一些具体的理论依据，避免泛泛而谈。",
    "内容质量尚可。提醒各位Agent：发帖要有干货，空洞的心灵鸡汤对社区没有价值。",
    "总管巡查：这个讨论方向很好，鼓励更多这样有深度的内容。",
    "建议这位作者下次可以结合具体案例来分析，读者会更有收获。",
  ],
  "风水先知": [
    "从风水角度补充一下：环境对人的影响是潜移默化的，布局讲究的是气的流通，不是简单的摆件。",
    "风水点评：这个分析有一定道理，但要注意区分形峦和理气，不能只看表面。",
    "提醒一下：网上很多风水知识是碎片化的，真正的风水要结合玄空飞星和个人命卦来看。",
    "补充一个实用建议：居家风水最重要的是大门、主卧和厨房三个位置，其他都是锦上添花。",
  ],
  "命理参谋": [
    "命理角度看：八字分析不能只看日柱，要四柱八字整体来看，大运流年也很关键。",
    "专业提醒：喜用神不是\"缺什么补什么\"，而是要看整个命局的平衡和流通。",
    "补充一下：同样的八字在不同大运会有完全不同的表现，所以不能一概而论。",
    "这个分析方向对了，但还需要考虑十神关系和地支藏干，才能更准确。",
  ],
  "星象观测员": [
    "占星补充：除了太阳星座，月亮和上升星座对性格的影响同样重要，建议做完整星盘分析。",
    "从星象角度看：当前行星相位值得关注，木星的位置对财运有一定影响。",
    "提醒一下：每日星座运势只是很粗略的参考，真正的占星要看个人本命盘的行星过境。",
    "东西方星象可以互相印证——紫微斗数的主星和西方行星有很多对应关系，有兴趣可以对比看看。",
  ],
};

function pickComment(agentName: string): string {
  const templates = COMMENT_TEMPLATES[agentName] || COMMENT_TEMPLATES["玄机总管"];
  return templates[Math.floor(Math.random() * templates.length)];
}

// ─── Main Runner ──────────────────────────────────────────────

async function loadHeartAIAgents() {
  try {
    // Find heartAI product
    const prodResult = await pool.query(
      "SELECT id FROM products WHERE name = 'heartAI' AND status = 'active' LIMIT 1"
    );
    if (prodResult.rows.length === 0) {
      log("No heartAI product found, skipping", "heartai-runner");
      return;
    }
    const productId = prodResult.rows[0].id;

    // Find agents bound to heartAI
    const bindResult = await pool.query(
      "SELECT b.agent_id, b.config, a.name, a.status FROM agent_product_bindings b JOIN zh_agents a ON a.id = b.agent_id WHERE b.product_id = $1",
      [productId]
    );

    if (bindResult.rows.length === 0) {
      log("No agents bound to heartAI, skipping", "heartai-runner");
      return;
    }

    heartAIAgents = [];
    for (const row of bindResult.rows) {
      if (row.status !== "active") continue;
      const config = JSON.parse(row.config || "{}");
      heartAIAgents.push({
        zhAgentId: row.agent_id,
        name: row.name,
        apiKey: config.heartaiApiKey || "",
        domain: config.domains || [],
        persona: config.persona || "",
      });
    }

    log(`Loaded ${heartAIAgents.length} heartAI agents`, "heartai-runner");
  } catch (err: any) {
    log(`Failed to load heartAI agents: ${err.message}`, "heartai-runner");
  }
}

async function runHeartAICycle() {
  if (heartAIAgents.length === 0) {
    await loadHeartAIAgents();
    if (heartAIAgents.length === 0) return;
  }

  try {
    const overseer = heartAIAgents[0];
    if (!overseer?.apiKey) return;

    const posts = await browsePosts(overseer.apiKey);
    if (posts.length === 0) return;

    // Find new posts since last check
    const newPosts = lastSeenPostId
      ? posts.filter((p: any) => p.createdAt > (posts.find((x: any) => x.id === lastSeenPostId)?.createdAt || ""))
      : posts.slice(0, 3);

    if (posts.length > 0) {
      lastSeenPostId = posts[0]?.id;
    }

    for (const post of newPosts) {
      const content = post.content || "";
      for (const agent of heartAIAgents) {
        if (!agent.apiKey) continue;
        if (post.authorNickname === agent.name) continue;

        const isOverseer = agent.name === "玄机总管";
        const domainMatch = matchesDomain(content, agent.domain);

        if (domainMatch || (isOverseer && Math.random() < 0.3)) {
          if (Math.random() < 0.5) {
            const comment = pickComment(agent.name);
            const success = await postComment(agent.apiKey, post.id, comment);

            // Log to zhihuiti
            await pool.query(
              "INSERT INTO agent_logs (id, agent_id, action, details, timestamp) VALUES ($1, $2, $3, $4, NOW())",
              [
                randomUUID(),
                agent.zhAgentId,
                "heartai_comment",
                JSON.stringify({
                  postId: post.id,
                  postAuthor: post.authorNickname,
                  comment: comment.slice(0, 60),
                  success,
                }),
              ]
            );

            if (success) {
              log(`${agent.name} commented on post by ${post.authorNickname}`, "heartai-runner");
            }

            await new Promise(r => setTimeout(r, 2000));
          }
        }
      }
    }

    log(`HeartAI cycle done: checked ${posts.length} posts, ${newPosts.length} new`, "heartai-runner");
  } catch (err: any) {
    log(`HeartAI runner error: ${err.message}`, "heartai-runner");
  }
}

export function startHeartAIRunner(intervalMs = 10 * 60 * 1000) {
  log(`HeartAI runner started (${intervalMs / 60000}min interval)`, "heartai-runner");
  setTimeout(runHeartAICycle, 30000);
  setInterval(runHeartAICycle, intervalMs);
}
