import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Users, Trophy, Target, ArrowRight, Crown, Medal, Award } from "lucide-react";
import { formatRelativeTime } from "@/lib/format";

export default function UserLeaderboardPage() {
  const { data: leaderboard, isLoading } = useQuery<any[]>({
    queryKey: ["/api/user-leaderboard"],
    refetchInterval: 30000,
  });

  const topUsers = leaderboard ?? [];

  return (
    <div className="p-6 lg:p-10 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Users className="w-6 h-6 text-amber-400" />
        <h1 className="text-2xl font-bold">Predictor Leaderboard</h1>
        <Badge variant="outline" className="bg-amber-500/10 text-amber-400 border-amber-500/20">
          {topUsers.length} predictors
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm">
        Who makes the best market predictions? Ranked by challenge win rate and accuracy.
      </p>

      {/* Top 3 podium */}
      {topUsers.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {[1, 0, 2].map((idx) => {
            const user = topUsers[idx];
            if (!user) return null;
            const rank = idx === 0 ? 1 : idx === 1 ? 2 : 3;
            const RankIcon = rank === 1 ? Crown : rank === 2 ? Medal : Award;
            const color = rank === 1 ? "text-amber-400 border-amber-500/30" : rank === 2 ? "text-gray-300 border-gray-500/30" : "text-amber-600 border-amber-700/30";
            const order = rank === 1 ? "order-2" : rank === 2 ? "order-1" : "order-3";
            return (
              <Card key={user.sessionId} className={`${order} ${rank === 1 ? "ring-1 ring-amber-500/20" : ""}`}>
                <CardContent className={`p-4 text-center ${rank === 1 ? "pt-6" : "pt-4 mt-4"}`}>
                  <RankIcon className={`w-6 h-6 mx-auto mb-2 ${color}`} />
                  <p className="text-sm font-bold truncate">{user.displayName}</p>
                  <p className="text-lg font-mono font-bold text-emerald-400 mt-1">{user.winRate}%</p>
                  <p className="text-[10px] text-muted-foreground">{user.wins}W / {user.losses}L</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{user.totalChallenges} predictions</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Full list */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : topUsers.length === 0 ? (
        <Card className="bg-muted/20">
          <CardContent className="p-8 text-center">
            <Target className="w-12 h-12 mx-auto mb-3 opacity-30 text-muted-foreground" />
            <h3 className="font-semibold mb-2">No predictions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">Be the first to challenge a legend and get on the leaderboard!</p>
            <Link href="/challenge">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                <Target className="w-4 h-4 mr-2" />
                Make Your First Prediction
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border border-card-border bg-card/50 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-muted-foreground text-xs">
                <th className="text-left py-2.5 px-4 font-medium w-12">#</th>
                <th className="text-left py-2.5 px-4 font-medium">Predictor</th>
                <th className="text-right py-2.5 px-4 font-medium">Win Rate</th>
                <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell">W/L</th>
                <th className="text-right py-2.5 px-4 font-medium hidden md:table-cell">Total</th>
                <th className="text-right py-2.5 px-4 font-medium hidden lg:table-cell">Best Streak</th>
              </tr>
            </thead>
            <tbody>
              {topUsers.map((user: any, i: number) => (
                <tr key={user.sessionId} className="border-b border-card-border/50 hover:bg-accent/30 transition-colors">
                  <td className="py-2.5 px-4">
                    <span className={`font-mono font-bold ${i < 3 ? "text-amber-400" : "text-muted-foreground"}`}>
                      {i + 1}
                    </span>
                  </td>
                  <td className="py-2.5 px-4">
                    <span className="font-medium">{user.displayName}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right">
                    <span className={`font-mono font-bold ${user.winRate >= 60 ? "text-emerald-400" : user.winRate >= 40 ? "text-amber-400" : "text-red-400"}`}>
                      {user.winRate}%
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono hidden md:table-cell">
                    <span className="text-emerald-400">{user.wins}</span>
                    <span className="text-muted-foreground"> / </span>
                    <span className="text-red-400">{user.losses}</span>
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono text-muted-foreground hidden md:table-cell">
                    {user.totalChallenges}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono hidden lg:table-cell">
                    {user.bestStreak > 0 ? (
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                        {user.bestStreak} wins
                      </Badge>
                    ) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CTA */}
      <Card className="bg-muted/20">
        <CardContent className="p-4 flex items-center gap-3">
          <Target className="w-8 h-8 text-amber-400 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Climb the Leaderboard</h3>
            <p className="text-[11px] text-muted-foreground">Every challenge counts. Make accurate predictions to improve your rank.</p>
          </div>
          <Link href="/challenge">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black">
              Challenge <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
