import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowRight, Brain, Target, Clock, Shield, Zap, Eye, BarChart3, TrendingUp, Lightbulb, ChevronRight } from "lucide-react";
import { formatReturn, pnlColor } from "@/lib/format";
import { useState } from "react";

interface Article {
  id: string;
  title: string;
  subtitle: string;
  category: string;
  icon: typeof Shield;
  color: string;
  readTime: string;
  sections: { heading: string; content: string }[];
  agentExample: string;
  cta: { label: string; href: string };
}

const ARTICLES: Article[] = [
  {
    id: "value-investing",
    title: "What is Value Investing?",
    subtitle: "Buy assets for less than they're worth — the Buffett way",
    category: "Philosophy",
    icon: Shield,
    color: "text-blue-400",
    readTime: "4 min",
    sections: [
      { heading: "The Core Idea", content: "Value investing means buying assets that trade below their intrinsic value. Think of it like shopping for bargains — you want to buy a $100 bill for $70. Warren Buffett, Charlie Munger, and Ben Graham made their fortunes this way." },
      { heading: "How It Works in Practice", content: "Value investors look at fundamentals: revenue, earnings, cash flow, competitive advantages. They calculate what an asset is truly worth, then wait patiently for the market to misprice it. The key is discipline — you only buy when there's a significant 'margin of safety' between price and value." },
      { heading: "When Value Investing Shines", content: "Value strategies tend to outperform during market corrections and recoveries. When panic selling drives prices below intrinsic value, value investors are the ones buying. This is what Buffett means by 'be greedy when others are fearful.'" },
      { heading: "The Risks", content: "Value investing requires extreme patience. You might be 'right' but early — and early feels exactly like wrong. Value traps are real: sometimes a cheap stock is cheap for a reason. The key is distinguishing between temporarily undervalued and permanently impaired." },
    ],
    agentExample: "On AlphaArena, Warren Buffett's agent only buys after significant dips (>3%). It targets BTC and blue-chip stocks like AAPL and MSFT. Watch how it behaves during market drops — that's value investing in action.",
    cta: { label: "Watch Buffett's Agent", href: "/philosophy" },
  },
  {
    id: "momentum-trading",
    title: "What is Momentum Trading?",
    subtitle: "The trend is your friend — ride the wave",
    category: "Philosophy",
    icon: Zap,
    color: "text-emerald-400",
    readTime: "3 min",
    sections: [
      { heading: "The Core Idea", content: "Momentum trading is based on a simple observation: assets that are going up tend to keep going up, and assets going down tend to keep going down. Instead of fighting the trend, you ride it." },
      { heading: "How It Works", content: "Momentum traders use technical indicators — moving averages, RSI, MACD — to identify trends. When an asset breaks above its moving average with strong volume, they buy. When momentum fades, they sell quickly. Position sizing and stop-losses are critical." },
      { heading: "When Momentum Shines", content: "Trending markets are a momentum trader's paradise. The 2024 BTC halving rally was a perfect example — assets with strong upward momentum kept climbing for months. Stanley Druckenmiller's mantra: 'When you see it, bet big.'" },
      { heading: "The Risks", content: "Momentum fails in choppy, sideways markets. You get 'whipsawed' — buying high, getting stopped out, buying again, getting stopped out again. The key is recognizing whether you're in a trending or mean-reverting market." },
    ],
    agentExample: "Druckenmiller's agent on AlphaArena scans all 18 pairs for the strongest 10-period momentum and bets big (10% of cash). Watch how quickly it cuts losers — that's discipline.",
    cta: { label: "Watch Momentum Agents", href: "/philosophy" },
  },
  {
    id: "contrarian-investing",
    title: "What is Contrarian Investing?",
    subtitle: "Go against the crowd — buy fear, sell greed",
    category: "Philosophy",
    icon: Eye,
    color: "text-amber-400",
    readTime: "4 min",
    sections: [
      { heading: "The Core Idea", content: "Contrarian investors believe the crowd is usually wrong at extremes. When everyone is euphoric and buying, it's time to sell. When everyone is panicking and selling, it's time to buy. George Soros calls this 'reflexivity.'" },
      { heading: "How It Works", content: "Contrarians look for extreme sentiment — RSI at 15 (oversold) or 85 (overbought), massive deviations from moving averages, or news-driven panic. They take the opposite position and wait for mean reversion." },
      { heading: "The Psychology", content: "Being contrarian is psychologically brutal. You're buying when headlines scream disaster. You're selling when your friends are making money. Michael Burry was right about the 2008 housing crash — but he had to endure years of being called crazy first." },
      { heading: "The Risks", content: "The crowd can stay irrational longer than you can stay solvent. Being early is indistinguishable from being wrong. The key is having a clear catalyst or fundamental reason for the reversal, not just 'it's gone too far.'" },
    ],
    agentExample: "Soros's agent finds the most overextended pair (furthest from its 20-day SMA) and bets against it. Burry's agent buys when RSI drops below 25. Watch them during crashes — that's when they shine.",
    cta: { label: "Watch Contrarian Agents", href: "/philosophy" },
  },
  {
    id: "risk-management",
    title: "Position Sizing: The Most Important Skill",
    subtitle: "It's not about being right — it's about how much you bet when you're right",
    category: "Skills",
    icon: BarChart3,
    color: "text-purple-400",
    readTime: "3 min",
    sections: [
      { heading: "Why Position Sizing Matters", content: "You can be right 70% of the time and still lose money if your losing trades are 5x bigger than your winners. Conversely, you can be right only 30% of the time and be profitable if your winners are huge. Position sizing is the difference." },
      { heading: "The 1-2% Rule", content: "Professional traders typically risk 1-2% of their portfolio per trade. If you have $10,000, your maximum loss per trade should be $100-$200. This means adjusting your position size based on your stop-loss distance." },
      { heading: "Kelly Criterion", content: "The Kelly Criterion is a mathematical formula for optimal bet sizing: f = (bp - q) / b, where p is win probability, q is loss probability, and b is the payout ratio. Most pros use 'half Kelly' to reduce variance." },
      { heading: "Learn from AlphaArena", content: "Watch how different agents size their positions. Buffett uses 3-8% of cash per trade. Ackman goes 10%+ (activist, concentrated). Dalio keeps each position under 3% (diversified). The Diagnostics page shows when agents make oversized bets — and the consequences." },
    ],
    agentExample: "Check the Diagnostics page (/#/diagnostics) to see which agents have 'oversized position' failures. Compare Bill Ackman's concentrated bets vs Ray Dalio's diversified approach.",
    cta: { label: "View Agent Diagnostics", href: "/diagnostics" },
  },
  {
    id: "reading-charts",
    title: "How to Read a Trading Chart in 5 Minutes",
    subtitle: "Candlesticks, moving averages, and RSI — the essentials",
    category: "Skills",
    icon: TrendingUp,
    color: "text-cyan-400",
    readTime: "5 min",
    sections: [
      { heading: "Candlesticks", content: "Each candlestick shows 4 prices: open, high, low, close. Green = price went up (close > open). Red = price went down. The 'body' is the open-close range. The 'wicks' show the high and low. Long wicks mean indecision." },
      { heading: "Moving Averages", content: "A moving average smooths price data over N periods. SMA(20) = average of last 20 candles. When price is above the SMA, trend is up. When it crosses below, trend may be reversing. The '50/200 golden cross' (50 SMA crosses above 200 SMA) is a famous bullish signal." },
      { heading: "RSI (Relative Strength Index)", content: "RSI measures momentum on a 0-100 scale. Above 70 = overbought (may drop). Below 30 = oversold (may bounce). RSI divergence — when price makes new highs but RSI doesn't — is a powerful reversal signal." },
      { heading: "Putting It Together", content: "The best setups combine multiple signals: price pulling back to the 20 SMA + RSI at 35 + bullish candlestick pattern = strong buy signal. No single indicator is reliable alone — confirmation from multiple sources increases probability." },
    ],
    agentExample: "Jim Simons's agent uses RSI, MACD histogram, and Bollinger Bands together. Howard Marks uses RSI with trend filters. Watch how they combine indicators on the Philosophy Battle page.",
    cta: { label: "See Agents in Action", href: "/philosophy" },
  },
  {
    id: "market-psychology",
    title: "Market Psychology: Why We Lose Money",
    subtitle: "FOMO, loss aversion, and the biases that destroy portfolios",
    category: "Psychology",
    icon: Brain,
    color: "text-red-400",
    readTime: "4 min",
    sections: [
      { heading: "FOMO (Fear of Missing Out)", content: "You see BTC pumping 20% and rush to buy at the top. FOMO is the #1 reason retail traders lose money. The cure: have a plan BEFORE the market moves. If you didn't want BTC at $60K, why do you want it at $70K?" },
      { heading: "Loss Aversion", content: "Losing $100 feels twice as painful as gaining $100 feels good. This leads to: holding losers too long (hoping they'll recover) and selling winners too early (locking in gains before they disappear). The fix: set stop-losses and profit targets BEFORE entering." },
      { heading: "Anchoring Bias", content: "You bought BTC at $65K, so you won't sell at $55K because it 'should' go back to $65K. The market doesn't care about your entry price. The only question is: at TODAY's price, would you buy this asset? If no, sell." },
      { heading: "How AI Agents Help", content: "AI agents don't have emotions. They follow rules. That's their superpower. By watching how agents trade — and comparing their disciplined execution to your own instincts — you can identify your behavioral biases and correct them." },
    ],
    agentExample: "Challenge a legend on AlphaArena. Your gut says BTC will go up? Place the prediction. In 24 hours, compare your emotional call to the agent's systematic strategy. That gap is your bias.",
    cta: { label: "Challenge Your Biases", href: "/challenge" },
  },
];

const CATEGORIES = ["All", "Philosophy", "Skills", "Psychology"];

export default function LearnPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  const { data: leaderboard } = useQuery<any[]>({ queryKey: ["/api/leaderboard"] });

  const filtered = selectedCategory === "All" ? ARTICLES : ARTICLES.filter(a => a.category === selectedCategory);

  if (selectedArticle) {
    return <ArticleView article={selectedArticle} leaderboard={leaderboard} onBack={() => setSelectedArticle(null)} />;
  }

  return (
    <div className="p-6 lg:p-10 max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-cyan-400" />
        <h1 className="text-2xl font-bold">Learn</h1>
        <Badge variant="outline" className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20">{ARTICLES.length} articles</Badge>
      </div>
      <p className="text-muted-foreground text-sm max-w-xl">
        Become a smarter investor. Each article connects theory to live examples from AlphaArena's agents.
      </p>

      {/* Category filter */}
      <div className="flex gap-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              selectedCategory === cat ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30" : "bg-muted/50 text-muted-foreground border border-transparent hover:bg-muted"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Article grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {filtered.map((article) => {
          const Icon = article.icon;
          return (
            <Card key={article.id} className="cursor-pointer hover:border-cyan-500/30 transition-all group" onClick={() => setSelectedArticle(article)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-background border border-border flex items-center justify-center flex-shrink-0">
                    <Icon className={`w-5 h-5 ${article.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-[9px]">{article.category}</Badge>
                      <span className="text-[10px] text-muted-foreground">{article.readTime}</span>
                    </div>
                    <h3 className="font-semibold text-sm group-hover:text-cyan-400 transition-colors leading-tight">{article.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{article.subtitle}</p>
                <div className="flex items-center justify-end mt-3">
                  <span className="text-xs text-cyan-400 flex items-center gap-1 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    Read <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Take Quiz CTA */}
      <Card className="bg-gradient-to-r from-amber-500/5 to-cyan-500/5 border-amber-500/20">
        <CardContent className="p-5 flex items-center gap-4">
          <Brain className="w-10 h-10 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm">Not sure where to start?</h3>
            <p className="text-xs text-muted-foreground">Take the Investor Profile Quiz to find which philosophy matches you.</p>
          </div>
          <Link href="/quiz">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
              Take Quiz <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

function ArticleView({ article, leaderboard, onBack }: { article: Article; leaderboard?: any[]; onBack: () => void }) {
  const Icon = article.icon;

  // Find relevant agent performance
  const relevantAgents = (leaderboard ?? []).slice(0, 5);

  return (
    <div className="p-6 lg:p-10 max-w-3xl mx-auto space-y-6">
      <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors">
        ← Back to articles
      </button>

      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-background border border-border flex items-center justify-center flex-shrink-0">
          <Icon className={`w-6 h-6 ${article.color}`} />
        </div>
        <div>
          <Badge variant="outline" className="text-[9px] mb-1">{article.category} · {article.readTime}</Badge>
          <h1 className="text-2xl font-bold leading-tight">{article.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{article.subtitle}</p>
        </div>
      </div>

      {/* Article content */}
      {article.sections.map((section, i) => (
        <div key={i}>
          <h2 className="text-lg font-semibold mb-2">{section.heading}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">{section.content}</p>
        </div>
      ))}

      {/* Live example from AlphaArena */}
      <Card className="bg-gradient-to-r from-cyan-500/5 to-purple-500/5 border-cyan-500/20">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <Lightbulb className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm mb-2">See It Live on AlphaArena</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{article.agentExample}</p>
              <Link href={article.cta.href}>
                <Button size="sm" className="mt-3 bg-cyan-500 hover:bg-cyan-600 text-black">
                  {article.cta.label} <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current leaderboard snapshot */}
      {relevantAgents.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Current Agent Performance</h3>
            <div className="space-y-2">
              {relevantAgents.map((entry: any) => (
                <div key={entry.agentId} className="flex items-center justify-between py-1.5">
                  <Link href={`/agents/${entry.agentId}`}>
                    <span className="text-sm font-medium hover:text-cyan-400 cursor-pointer transition-colors">{entry.agent?.name}</span>
                  </Link>
                  <span className={`text-sm font-mono font-bold ${pnlColor(entry.totalReturn)}`}>
                    {formatReturn(entry.totalReturn)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next article */}
      <div className="flex gap-3">
        <Link href="/challenge">
          <Button variant="outline" className="flex-1">
            <Target className="w-4 h-4 mr-2" /> Test What You Learned
          </Button>
        </Link>
        <Link href="/time-machine">
          <Button variant="outline" className="flex-1">
            <Clock className="w-4 h-4 mr-2" /> See Historical Examples
          </Button>
        </Link>
      </div>
    </div>
  );
}
