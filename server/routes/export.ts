import { z } from "zod";
import { eq } from "drizzle-orm";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { tasks, scheduledJobs, knowledgeDocuments } from "../../drizzle/schema";
import { execSync } from "child_process";
import { writeFileSync, readFileSync, unlinkSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import os from "os";

// Ensure temp directory exists
const TEMP_DIR = join(os.tmpdir(), "jarvis-exports");
if (!existsSync(TEMP_DIR)) {
  mkdirSync(TEMP_DIR, { recursive: true });
}

// Generate unique filename
function generateFilename(prefix: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}-${timestamp}`;
}

// Convert markdown to HTML with styling
function markdownToHtml(markdown: string, title: string): string {
  // Simple markdown to HTML conversion
  let html = markdown
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
      line-height: 1.6;
    }
    h1 { color: #00d4ff; border-bottom: 2px solid #00d4ff; padding-bottom: 10px; }
    h2 { color: #0099cc; margin-top: 30px; }
    h3 { color: #006699; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
    th { background-color: #00d4ff; color: white; }
    tr:nth-child(even) { background-color: #f9f9f9; }
    code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
    .logo { font-size: 24px; font-weight: bold; color: #00d4ff; }
    .date { color: #666; font-size: 14px; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #666; font-size: 12px; }
    .status-todo { color: #ff9800; }
    .status-in_progress { color: #2196f3; }
    .status-done { color: #4caf50; }
    .priority-low { color: #9e9e9e; }
    .priority-medium { color: #ff9800; }
    .priority-high { color: #f44336; }
    .priority-critical { color: #9c27b0; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">JARVIS v5.9</div>
    <div class="date">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
  </div>
  <p>${html}</p>
  <div class="footer">
    Généré par Jarvis IHM v5.9 • ${new Date().toLocaleString('fr-FR')}
  </div>
</body>
</html>`;
}

export const exportRouter = router({
  // Export performance report as PDF
  performanceReport: publicProcedure
    .input(z.object({
      includeHardware: z.boolean().default(true),
      includeTasks: z.boolean().default(true),
      includeJobs: z.boolean().default(true),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      
      let markdown = `# Rapport de Performance Jarvis\n\n`;
      markdown += `**Date de génération:** ${new Date().toLocaleString('fr-FR')}\n\n`;

      // Hardware section
      if (input.includeHardware) {
        markdown += `## État du Système\n\n`;
        markdown += `### Nœud Orchestrateur (DGX Spark)\n`;
        markdown += `- **CPU:** AMD EPYC 7742 64-Core\n`;
        markdown += `- **GPU:** 8x NVIDIA A100 80GB\n`;
        markdown += `- **RAM:** 1TB DDR4\n`;
        markdown += `- **Stockage:** 15TB NVMe RAG\n\n`;
        
        markdown += `### Nœud Réflexe (Jetson Thor)\n`;
        markdown += `- **SoC:** NVIDIA Thor\n`;
        markdown += `- **RAM:** 128GB Unified\n`;
        markdown += `- **Latence:** < 60ms\n\n`;
      }

      // Tasks section
      if (input.includeTasks && db) {
        const taskList = await db.select().from(tasks);
        
        markdown += `## Tâches (${taskList.length} total)\n\n`;
        
        const todoCount = taskList.filter(t => t.status === 'todo').length;
        const inProgressCount = taskList.filter(t => t.status === 'in_progress').length;
        const doneCount = taskList.filter(t => t.status === 'done').length;
        
        markdown += `| Statut | Nombre |\n`;
        markdown += `|--------|--------|\n`;
        markdown += `| À faire | ${todoCount} |\n`;
        markdown += `| En cours | ${inProgressCount} |\n`;
        markdown += `| Terminé | ${doneCount} |\n\n`;
        
        if (taskList.length > 0) {
          markdown += `### Liste des Tâches\n\n`;
          markdown += `| Titre | Priorité | Statut | Échéance |\n`;
          markdown += `|-------|----------|--------|----------|\n`;
          
          for (const task of taskList) {
            const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString('fr-FR') : '-';
            markdown += `| ${task.title} | ${task.priority} | ${task.status} | ${dueDate} |\n`;
          }
          markdown += '\n';
        }
      }

      // Jobs section
      if (input.includeJobs && db) {
        const jobList = await db.select().from(scheduledJobs);
        
        markdown += `## Jobs Planifiés (${jobList.length} total)\n\n`;
        
        const enabledCount = jobList.filter(j => j.enabled).length;
        
        markdown += `| Statut | Nombre |\n`;
        markdown += `|--------|--------|\n`;
        markdown += `| Actifs | ${enabledCount} |\n`;
        markdown += `| Inactifs | ${jobList.length - enabledCount} |\n\n`;
        
        if (jobList.length > 0) {
          markdown += `### Liste des Jobs\n\n`;
          markdown += `| Nom | Expression Cron | Actif | Dernière Exécution |\n`;
          markdown += `|-----|-----------------|-------|--------------------|\n`;
          
          for (const job of jobList) {
            const lastRun = job.lastRun ? new Date(job.lastRun).toLocaleString('fr-FR') : '-';
            markdown += `| ${job.name} | \`${job.cronExpression}\` | ${job.enabled ? 'Oui' : 'Non'} | ${lastRun} |\n`;
          }
          markdown += '\n';
        }
      }

      // Generate HTML
      const html = markdownToHtml(markdown, 'Rapport de Performance Jarvis');
      
      // Save HTML file
      const filename = generateFilename('rapport-performance');
      const htmlPath = join(TEMP_DIR, `${filename}.html`);
      writeFileSync(htmlPath, html);

      // Try to convert to PDF using wkhtmltopdf or return HTML
      let pdfBase64: string | null = null;
      try {
        const pdfPath = join(TEMP_DIR, `${filename}.pdf`);
        execSync(`wkhtmltopdf --quiet "${htmlPath}" "${pdfPath}"`, { timeout: 30000 });
        
        if (existsSync(pdfPath)) {
          pdfBase64 = readFileSync(pdfPath).toString('base64');
          unlinkSync(pdfPath);
        }
      } catch (error) {
        console.warn("PDF conversion failed, returning HTML:", error);
      }

      // Read HTML as fallback
      const htmlBase64 = readFileSync(htmlPath).toString('base64');
      unlinkSync(htmlPath);

      return {
        success: true,
        filename: `${filename}.${pdfBase64 ? 'pdf' : 'html'}`,
        contentType: pdfBase64 ? 'application/pdf' : 'text/html',
        data: pdfBase64 || htmlBase64,
        markdown,
      };
    }),

  // Export chat history as PDF
  chatHistory: publicProcedure
    .input(z.object({
      messages: z.array(z.object({
        role: z.enum(['user', 'assistant', 'system']),
        content: z.string(),
        timestamp: z.string().optional(),
      })),
      sessionId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      let markdown = `# Historique de Conversation Jarvis\n\n`;
      markdown += `**Session:** ${input.sessionId || 'Non spécifiée'}\n`;
      markdown += `**Exporté le:** ${new Date().toLocaleString('fr-FR')}\n\n`;
      markdown += `---\n\n`;

      for (const msg of input.messages) {
        const time = msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString('fr-FR') : '';
        const role = msg.role === 'user' ? '👤 Utilisateur' : msg.role === 'assistant' ? '🤖 Jarvis' : '⚙️ Système';
        
        markdown += `### ${role} ${time ? `(${time})` : ''}\n\n`;
        markdown += `${msg.content}\n\n`;
        markdown += `---\n\n`;
      }

      // Generate HTML
      const html = markdownToHtml(markdown, 'Historique de Conversation Jarvis');
      
      // Save and convert
      const filename = generateFilename('chat-history');
      const htmlPath = join(TEMP_DIR, `${filename}.html`);
      writeFileSync(htmlPath, html);

      let pdfBase64: string | null = null;
      try {
        const pdfPath = join(TEMP_DIR, `${filename}.pdf`);
        execSync(`wkhtmltopdf --quiet "${htmlPath}" "${pdfPath}"`, { timeout: 30000 });
        
        if (existsSync(pdfPath)) {
          pdfBase64 = readFileSync(pdfPath).toString('base64');
          unlinkSync(pdfPath);
        }
      } catch (error) {
        console.warn("PDF conversion failed, returning HTML:", error);
      }

      const htmlBase64 = readFileSync(htmlPath).toString('base64');
      unlinkSync(htmlPath);

      return {
        success: true,
        filename: `${filename}.${pdfBase64 ? 'pdf' : 'html'}`,
        contentType: pdfBase64 ? 'application/pdf' : 'text/html',
        data: pdfBase64 || htmlBase64,
        messageCount: input.messages.length,
      };
    }),

  // Export knowledge document as PDF
  knowledgeDocument: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const docs = await db.select()
        .from(knowledgeDocuments)
        .where(eq(knowledgeDocuments.id, input.id))
        .limit(1);

      if (!docs[0]) {
        throw new Error("Document not found");
      }

      const doc = docs[0];
      
      let markdown = `# ${doc.title}\n\n`;
      markdown += `**Source:** ${doc.source || 'Non spécifiée'}\n`;
      markdown += `**Type:** ${doc.fileType || 'Non spécifié'}\n`;
      markdown += `**Créé le:** ${new Date(doc.createdAt).toLocaleDateString('fr-FR')}\n\n`;
      markdown += `---\n\n`;
      markdown += doc.content || 'Aucun contenu disponible';

      // Generate HTML
      const html = markdownToHtml(markdown, doc.title);
      
      // Save and convert
      const filename = generateFilename(`doc-${doc.id}`);
      const htmlPath = join(TEMP_DIR, `${filename}.html`);
      writeFileSync(htmlPath, html);

      let pdfBase64: string | null = null;
      try {
        const pdfPath = join(TEMP_DIR, `${filename}.pdf`);
        execSync(`wkhtmltopdf --quiet "${htmlPath}" "${pdfPath}"`, { timeout: 30000 });
        
        if (existsSync(pdfPath)) {
          pdfBase64 = readFileSync(pdfPath).toString('base64');
          unlinkSync(pdfPath);
        }
      } catch (error) {
        console.warn("PDF conversion failed, returning HTML:", error);
      }

      const htmlBase64 = readFileSync(htmlPath).toString('base64');
      unlinkSync(htmlPath);

      return {
        success: true,
        filename: `${filename}.${pdfBase64 ? 'pdf' : 'html'}`,
        contentType: pdfBase64 ? 'application/pdf' : 'text/html',
        data: pdfBase64 || htmlBase64,
        title: doc.title,
      };
    }),
});
