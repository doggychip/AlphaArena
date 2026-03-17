import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Bot, Key, Copy, Check, UserPlus } from "lucide-react";

export default function RegisterPage() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [result, setResult] = useState<any>(null);

  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    agentName: "",
    agentDescription: "",
    agentType: "llm_agent" as "llm_agent" | "algo_bot" | "hybrid",
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
      toast({ title: "Registration successful!", description: `Agent "${data.agent.name}" is ready to trade.` });
    },
    onError: (err: Error) => {
      toast({ title: "Registration failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  const copyApiKey = () => {
    if (result?.apiKey) {
      navigator.clipboard.writeText(result.apiKey).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (result) {
    return (
      <div className="p-6 lg:p-10 max-w-2xl">
        <Card className="bg-card/50 border-card-border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              <CardTitle className="text-lg">Registration Complete</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground">Agent Name</span>
                <p className="font-medium" data-testid="text-registered-agent">{result.agent.name}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Agent ID</span>
                <p className="font-mono text-sm">{result.agent.id}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">Starting Capital</span>
                <p className="font-mono text-sm">$100,000.00</p>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-2 mb-2">
                <Key className="w-4 h-4 text-amber-400" />
                <span className="text-sm font-semibold text-amber-400">Your API Key</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Save this key — you'll need it to submit trades via the API. It won't be shown again.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 p-2.5 rounded bg-background/50 border border-border font-mono text-xs break-all" data-testid="text-api-key">
                  {result.apiKey}
                </code>
                <Button variant="outline" size="sm" onClick={copyApiKey} data-testid="button-copy-key">
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="p-4 rounded-lg bg-card border border-card-border">
              <p className="text-xs text-muted-foreground mb-2">Quick start — submit your first trade:</p>
              <pre className="text-xs font-mono text-foreground overflow-x-auto p-3 rounded bg-background/50">
{`curl -X POST /api/trades \\
  -H "Content-Type: application/json" \\
  -H "X-API-Key: ${result.apiKey.slice(0, 15)}..." \\
  -d '{
    "agentId": "${result.agent.id}",
    "pair": "BTC/USD",
    "side": "buy",
    "quantity": 0.1
  }'`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <UserPlus className="w-5 h-5 text-cyan-400" />
        <h1 className="text-xl font-bold">Register Agent</h1>
      </div>

      <Card className="bg-card/50 border-card-border">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Account section */}
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Account</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="username" className="text-xs">Username</Label>
                  <Input
                    id="username"
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="trader_bot_1"
                    required
                    data-testid="input-username"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="you@example.com"
                    required
                    data-testid="input-email"
                    className="mt-1"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="password" className="text-xs">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 6 characters"
                  required
                  data-testid="input-password"
                  className="mt-1"
                />
              </div>
            </div>

            {/* Agent section */}
            <div className="space-y-3 pt-2">
              <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Agent Details</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="agentName" className="text-xs">Agent Name</Label>
                  <Input
                    id="agentName"
                    value={form.agentName}
                    onChange={(e) => setForm({ ...form, agentName: e.target.value })}
                    placeholder="My Trading Bot"
                    required
                    data-testid="input-agent-name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="agentType" className="text-xs">Agent Type</Label>
                  <Select value={form.agentType} onValueChange={(val: any) => setForm({ ...form, agentType: val })}>
                    <SelectTrigger className="mt-1" data-testid="select-agent-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="llm_agent">LLM Agent</SelectItem>
                      <SelectItem value="algo_bot">Algo Bot</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div>
                <Label htmlFor="agentDescription" className="text-xs">Description (optional)</Label>
                <Textarea
                  id="agentDescription"
                  value={form.agentDescription}
                  onChange={(e) => setForm({ ...form, agentDescription: e.target.value })}
                  placeholder="Describe your agent's strategy..."
                  rows={3}
                  data-testid="input-agent-description"
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold"
              disabled={mutation.isPending}
              data-testid="button-submit-register"
            >
              {mutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                  Registering...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Bot className="w-4 h-4" />
                  Register Agent
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
