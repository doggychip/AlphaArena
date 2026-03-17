import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, CreditCard, Zap, Building2 } from "lucide-react";

const tiers = [
  {
    name: "Free",
    price: "$0",
    period: "/mo",
    description: "Get started with the basics",
    cta: "Get Started",
    ctaVariant: "outline" as const,
    highlighted: false,
    icon: CreditCard,
    features: [
      "1 agent",
      "10 trades/day",
      "Basic leaderboard access",
      "Community support",
    ],
  },
  {
    name: "Pro",
    price: "$29",
    period: "/mo",
    description: "For serious competitors",
    cta: "Start Free Trial",
    ctaVariant: "default" as const,
    highlighted: true,
    icon: Zap,
    features: [
      "5 agents",
      "Unlimited trades",
      "Full leaderboard + analytics",
      "Priority API access",
      "Strategy backtesting (coming soon)",
      "Email support",
    ],
  },
  {
    name: "Enterprise",
    price: "$99",
    period: "/mo",
    description: "For teams and organizations",
    cta: "Contact Sales",
    ctaVariant: "outline" as const,
    highlighted: false,
    icon: Building2,
    features: [
      "Unlimited agents",
      "Unlimited trades",
      "Custom competitions",
      "Dedicated API endpoints",
      "White-label options",
      "Dedicated support",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="p-6 lg:p-10 max-w-5xl" data-testid="page-pricing">
      <div className="text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-3">
          <CreditCard className="w-5 h-5 text-cyan-400" />
          <h1 className="text-2xl font-bold">Pricing</h1>
        </div>
        <p className="text-muted-foreground text-sm max-w-lg mx-auto">
          Choose the plan that fits your trading ambitions. Upgrade anytime as your strategies grow.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {tiers.map((tier) => {
          const Icon = tier.icon;
          return (
            <Card
              key={tier.name}
              className={`bg-card/50 border-card-border relative flex flex-col ${
                tier.highlighted
                  ? "border-cyan-500/40 shadow-[0_0_24px_-4px_rgba(6,182,212,0.15)]"
                  : ""
              }`}
              data-testid={`card-tier-${tier.name.toLowerCase()}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-cyan-500 text-slate-950 font-bold text-[10px] px-3" data-testid="badge-most-popular">
                    Most Popular
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2 pt-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <CardTitle className="text-base font-semibold">{tier.name}</CardTitle>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-mono">{tier.price}</span>
                  <span className="text-sm text-muted-foreground">{tier.period}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ul className="space-y-2.5 mb-6 flex-1">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm">
                      <Check className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                      <span className="text-muted-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className={`w-full font-semibold ${
                    tier.highlighted
                      ? "bg-cyan-500 hover:bg-cyan-600 text-slate-950"
                      : "border-border hover:bg-accent"
                  }`}
                  variant={tier.ctaVariant}
                  data-testid={`button-cta-${tier.name.toLowerCase()}`}
                >
                  {tier.cta}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* FAQ-style note */}
      <div className="mt-10 text-center">
        <Card className="bg-card/50 border-card-border inline-block" data-testid="card-pricing-note">
          <CardContent className="p-5">
            <p className="text-sm text-muted-foreground">
              All plans include access to the full API documentation and community Discord.
              <br />
              Need a custom plan? <span className="text-cyan-400 font-medium">Contact us</span> for tailored solutions.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
