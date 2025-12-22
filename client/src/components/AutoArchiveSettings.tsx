import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Archive, Loader2, Play, Eye } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AutoArchiveSettings() {
  const [autoArchiveEnabled, setAutoArchiveEnabled] = useState(false);
  const [daysInactive, setDaysInactive] = useState(30);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<{
    archivedCount: number;
    conversations: Array<{ id: number; title: string; lastMessageAt: Date | null }>;
  } | null>(null);

  const utils = trpc.useUtils();
  
  const autoArchiveMutation = trpc.conversations.autoArchive.useMutation({
    onSuccess: (data) => {
      if (data.dryRun) {
        setPreviewData(data);
        setPreviewOpen(true);
      } else {
        toast.success(`${data.archivedCount} conversation(s) archivée(s)`);
        utils.conversations.list.invalidate();
        utils.conversations.getStats.invalidate();
      }
    },
    onError: (error) => {
      toast.error("Erreur lors de l'archivage: " + error.message);
    },
  });

  const handlePreview = () => {
    autoArchiveMutation.mutate({ daysInactive, dryRun: true });
  };

  const handleArchive = () => {
    autoArchiveMutation.mutate({ daysInactive, dryRun: false });
    setPreviewOpen(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDaysAgo = (date: Date | null) => {
    if (!date) return "";
    const days = Math.floor((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60 * 24));
    return `il y a ${days} jour${days > 1 ? "s" : ""}`;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Archivage automatique
          </CardTitle>
          <CardDescription>
            Archivez automatiquement les conversations inactives
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable Auto-Archive */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Archivage automatique</Label>
              <p className="text-sm text-muted-foreground">
                Archiver automatiquement les conversations inactives
              </p>
            </div>
            <Switch
              checked={autoArchiveEnabled}
              onCheckedChange={setAutoArchiveEnabled}
            />
          </div>

          <Separator />

          {/* Days Inactive Slider */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base">Période d'inactivité</Label>
              <span className="text-sm font-medium">{daysInactive} jours</span>
            </div>
            <Slider
              value={[daysInactive]}
              onValueChange={([value]) => setDaysInactive(value)}
              min={7}
              max={90}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>7 jours</span>
              <span>30 jours</span>
              <span>90 jours</span>
            </div>
          </div>

          <Separator />

          {/* Manual Archive Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handlePreview}
              disabled={autoArchiveMutation.isPending}
              className="flex-1"
            >
              {autoArchiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Prévisualiser
            </Button>
            <Button
              variant="default"
              onClick={() => autoArchiveMutation.mutate({ daysInactive, dryRun: false })}
              disabled={autoArchiveMutation.isPending}
              className="flex-1"
            >
              {autoArchiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Archiver maintenant
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Les conversations archivées restent accessibles dans l'historique avec le filtre "Archivées".
          </p>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Archive className="h-5 w-5" />
              Prévisualisation de l'archivage
            </DialogTitle>
            <DialogDescription>
              {previewData?.archivedCount || 0} conversation(s) seront archivée(s)
            </DialogDescription>
          </DialogHeader>

          {previewData && previewData.conversations.length > 0 ? (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2">
                {previewData.conversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-3 bg-muted/50 rounded-lg space-y-1"
                  >
                    <p className="font-medium text-sm truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground">
                      Dernier message: {formatDate(conv.lastMessageAt)} ({formatDaysAgo(conv.lastMessageAt)})
                    </p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Aucune conversation à archiver</p>
              <p className="text-sm mt-1">
                Toutes vos conversations sont actives ou déjà archivées
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewOpen(false)}>
              Annuler
            </Button>
            <Button
              onClick={handleArchive}
              disabled={!previewData || previewData.archivedCount === 0 || autoArchiveMutation.isPending}
            >
              {autoArchiveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Archive className="h-4 w-4 mr-2" />
              )}
              Archiver {previewData?.archivedCount || 0} conversation(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
