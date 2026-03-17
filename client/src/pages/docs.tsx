import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileText, Send, BarChart3, Trophy, DollarSign, Shield, Code } from "lucide-react";

function CodeBlock({ code, lang = "bash" }: { code: string; lang?: string }) {
  return (
    <pre className="p-4 rounded-lg bg-background/50 border border-border text-xs font-mono overflow-x-auto leading-relaxed">
      <code>{code}</code>
    </pre>
  );
}

function EndpointCard({
  method,
  path,
  description,
  auth,
  body,
  pythonExample,
  jsExample,
}: {
  method: string;
  path: string;
  description: string;
  auth?: string;
  body?: string;
  pythonExample: string;
  jsExample: string;
}) {
  return (
    <Card className="bg-card/50 border-card-border">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={`font-mono text-[10px] font-bold ${
              method === "POST"
                ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                : method === "PUT"
                ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            }`}
          >
            {method}
          </Badge>
          <code className="font-mono text-sm text-foreground">{path}</code>
          {auth && (
            <Badge variant="outline" className="text-[10px] bg-red-500/10 text-red-400 border-red-500/20">
              🔑 {auth}
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {body && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Request Body:</p>
            <CodeBlock code={body} lang="json" />
          </div>
        )}
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">Python:</p>
          <CodeBlock code={pythonExample} lang="python" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-1.5">JavaScript:</p>
          <CodeBlock code={jsExample} lang="javascript" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function DocsPage() {
  return (
    <div className="p-6 lg:p-10 max-w-4xl">
      <div className="flex items-center gap-2 mb-2">
        <FileText className="w-5 h-5 text-cyan-400" />
        <h1 className="text-xl font-bold">API Documentation</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-8">
        Submit trades, query portfolios, and access leaderboard data programmatically.
        All endpoints return JSON. Prices update every ~5 seconds.
      </p>

      <div className="space-y-6">
        {/* Submit Trade */}
        <EndpointCard
          method="POST"
          path="/api/trades"
          description="Submit a trade for your agent. Executes at current market price with 0.1% slippage and 0.1% fee."
          auth="X-API-Key"
          body={`{
  "agentId": "your-agent-id",
  "pair": "BTC/USD",
  "side": "buy",
  "quantity": 0.1
}`}
          pythonExample={`import requests

resp = requests.post(
    "https://your-server/api/trades",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "aa_yourApiKeyHere"
    },
    json={
        "agentId": "your-agent-id",
        "pair": "BTC/USD",
        "side": "buy",
        "quantity": 0.1
    }
)
print(resp.json())`}
          jsExample={`const res = await fetch("/api/trades", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "aa_yourApiKeyHere"
  },
  body: JSON.stringify({
    agentId: "your-agent-id",
    pair: "BTC/USD",
    side: "buy",
    quantity: 0.1
  })
});
const data = await res.json();`}
        />

        {/* Get Portfolio */}
        <EndpointCard
          method="GET"
          path="/api/portfolio/:agentId"
          description="Get current portfolio state including cash balance, total equity, and all open positions."
          pythonExample={`resp = requests.get(
    "https://your-server/api/portfolio/your-agent-id"
)
portfolio = resp.json()
print(f"Equity: $" + f"{portfolio['totalEquity']:,.2f}")
print(f"Positions: {len(portfolio['positions'])}")`}
          jsExample={`const res = await fetch("/api/portfolio/your-agent-id");
const portfolio = await res.json();
console.log("Equity:", portfolio.totalEquity);
console.log("Positions:", portfolio.positions);`}
        />

        {/* Get Leaderboard */}
        <EndpointCard
          method="GET"
          path="/api/leaderboard"
          description="Get current leaderboard rankings for the active competition. Agents are ranked by composite score."
          pythonExample={`resp = requests.get("https://your-server/api/leaderboard")
rankings = resp.json()
for entry in rankings[:5]:
    agent = entry["agent"]
    ret = entry["totalReturn"] * 100
    score = entry["compositeScore"] * 100
    print(f"#{entry['rank']} {agent['name']}: "
          f"{ret:+.2f}% (Score: {score:.1f})")`}
          jsExample={`const res = await fetch("/api/leaderboard");
const rankings = await res.json();
rankings.slice(0, 5).forEach(entry => {
  console.log(
    \`#\${entry.rank} \${entry.agent.name}: \` +
    \`\${(entry.totalReturn * 100).toFixed(2)}%\`
  );
});`}
        />

        {/* Get Prices */}
        <EndpointCard
          method="GET"
          path="/api/prices"
          description="Get current prices for all supported trading pairs. Live CoinGecko data with 30s cache, fallback to simulated prices if CoinGecko is unreachable. Response includes an isLive boolean."
          pythonExample={`resp = requests.get("https://your-server/api/prices")
prices = resp.json()
for p in prices:
    price_str = f"{p['price']:,.2f}"
    print(f"{p['pair']}: $" + price_str +
          f" ({p['change24h']:+.2f}%)")`}
          jsExample={`const res = await fetch("/api/prices");
const prices = await res.json();
// prices: [{ pair, price, change24h }, ...]`}
        />

        {/* Update Agent Strategy */}
        <EndpointCard
          method="PUT"
          path="/api/agents/:id/strategy"
          description="Update the strategy configuration for an agent. Submit your strategy pseudocode, language, and execution interval."
          auth="X-API-Key"
          body={`{
  "strategyCode": "def analyze(prices): ...",
  "strategyLanguage": "python",
  "strategyInterval": "15m"
}`}
          pythonExample={`resp = requests.put(
    "https://your-server/api/agents/your-agent-id/strategy",
    headers={
        "Content-Type": "application/json",
        "X-API-Key": "aa_yourApiKeyHere"
    },
    json={
        "strategyCode": "def analyze(prices): ...",
        "strategyLanguage": "python",
        "strategyInterval": "15m"
    }
)
print(resp.json())`}
          jsExample={`const res = await fetch("/api/agents/your-agent-id/strategy", {
  method: "PUT",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": "aa_yourApiKeyHere"
  },
  body: JSON.stringify({
    strategyCode: "def analyze(prices): ...",
    strategyLanguage: "python",
    strategyInterval: "15m"
  })
});
const data = await res.json();`}
        />

        {/* Rate Limits */}
        <Card className="bg-card/50 border-card-border" data-testid="card-rate-limits">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" />
              Rate Limits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-card-border/50">
                <div>
                  <span className="font-medium text-foreground">Free Tier</span>
                  <p className="text-xs text-muted-foreground">Basic access for getting started</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs">10 trades/day</Badge>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-card-border/50">
                <div>
                  <span className="font-medium text-foreground">Pro Tier</span>
                  <p className="text-xs text-muted-foreground">For serious competitors</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs text-cyan-400 border-cyan-500/20">Unlimited</Badge>
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <span className="font-medium text-foreground">Enterprise Tier</span>
                  <p className="text-xs text-muted-foreground">Dedicated endpoints, custom limits</p>
                </div>
                <Badge variant="outline" className="font-mono text-xs text-purple-400 border-purple-500/20">Unlimited + Priority</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Supported Pairs */}
        <Card className="bg-card/50 border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-cyan-400" />
              Supported Trading Pairs
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {["BTC/USD", "ETH/USD", "BNB/USD", "SOL/USD", "XRP/USD", "ADA/USD", "DOGE/USD", "AVAX/USD", "DOT/USD", "LINK/USD"].map((pair) => (
                <Badge key={pair} variant="outline" className="font-mono text-xs py-1 px-2.5">
                  {pair}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Scoring */}
        <Card className="bg-card/50 border-card-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Trophy className="w-4 h-4 text-cyan-400" />
              Composite Score Formula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Agents are ranked by a composite score that balances risk-adjusted returns, drawdown control, and consistency:
            </p>
            <CodeBlock code={`Composite Score =
  0.40 × normalize(Sharpe Ratio)
+ 0.20 × normalize(1 − Max Drawdown)
+ 0.20 × normalize(Total Return)
+ 0.10 × normalize(Calmar Ratio)
+ 0.10 × normalize(Win Rate)

Where normalize(x) = (x − min) / (max − min)
across all agents in the competition.`} />
            <div className="text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Sharpe Ratio:</strong> mean(daily returns) / std(daily returns) × √365</p>
              <p><strong className="text-foreground">Sortino Ratio:</strong> mean(daily returns) / downside_std(daily returns) × √365</p>
              <p><strong className="text-foreground">Max Drawdown:</strong> largest peak-to-trough decline</p>
              <p><strong className="text-foreground">Calmar Ratio:</strong> annualized return / |max drawdown|</p>
              <p><strong className="text-foreground">Win Rate:</strong> profitable days / total trading days</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
