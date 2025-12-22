import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { 
  MessageSquare, 
  Archive, 
  TrendingUp, 
  Tag, 
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  Loader2
} from "lucide-react";

export default function ConversationStatsPage() {
  const { data: stats, isLoading } = trpc.conversations.getStats.useQuery();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Statistiques des Conversations</h1>
          <p className="text-muted-foreground mt-1">
            Analyse de votre historique de conversations avec Jarvis
          </p>
        </div>
        {stats?.isSimulation && (
          <span className="px-3 py-1 bg-yellow-500/10 text-yellow-500 text-sm rounded-full">
            Mode Démo
          </span>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Conversations</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalConversations || 0}</div>
            <p className="text-xs text-muted-foreground">
              dont {stats?.archivedConversations || 0} archivées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Messages</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalMessages || 0}</div>
            <p className="text-xs text-muted-foreground">
              échangés avec Jarvis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Moyenne par Conv.</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgMessagesPerConversation || 0}</div>
            <p className="text-xs text-muted-foreground">
              messages par conversation
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jour le plus actif</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.mostActiveDay || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">
              jour de la semaine
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Conversations by Month */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Conversations par Mois
            </CardTitle>
            <CardDescription>
              Évolution sur les 6 derniers mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.conversationsByMonth && stats.conversationsByMonth.length > 0 ? (
                stats.conversationsByMonth.map((item) => (
                  <div key={item.month} className="flex items-center gap-4">
                    <div className="w-20 text-sm text-muted-foreground">
                      {item.month}
                    </div>
                    <div className="flex-1">
                      <div 
                        className="h-6 bg-primary/80 rounded-sm transition-all"
                        style={{ 
                          width: `${Math.min(100, (item.count / Math.max(...stats.conversationsByMonth.map(m => m.count))) * 100)}%` 
                        }}
                      />
                    </div>
                    <div className="w-8 text-sm font-medium text-right">
                      {item.count}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Aucune donnée disponible
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tag Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Distribution des Tags
            </CardTitle>
            <CardDescription>
              Tags les plus utilisés
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats?.tagDistribution && stats.tagDistribution.length > 0 ? (
                stats.tagDistribution.map((item, index) => {
                  const colors = [
                    'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500',
                    'bg-pink-500', 'bg-orange-500', 'bg-cyan-500', 'bg-red-500',
                    'bg-indigo-500', 'bg-teal-500'
                  ];
                  const maxCount = Math.max(...stats.tagDistribution.map(t => t.count));
                  
                  return (
                    <div key={item.tag} className="flex items-center gap-3">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{item.tag}</span>
                          <span className="text-sm text-muted-foreground">{item.count}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${colors[index % colors.length]} transition-all`}
                            style={{ width: `${(item.count / maxCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-muted-foreground text-center py-8">
                  Aucun tag utilisé
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Temps de Réponse Moyen</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgResponseTime || 0}s</div>
            <p className="text-xs text-muted-foreground">
              temps moyen de réponse du LLM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversations Actives</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(stats?.totalConversations || 0) - (stats?.archivedConversations || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              conversations non archivées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taux d'Archivage</CardTitle>
            <Archive className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalConversations 
                ? Math.round((stats.archivedConversations / stats.totalConversations) * 100) 
                : 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              des conversations archivées
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
