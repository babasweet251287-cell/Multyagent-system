import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });
  const PORT = 3000;

  app.use(express.json());

  // --- Simple Agent System ---
  const analyst = async (task: string, onStatus: (s: string) => void, multiplier: number, config: any) => {
    onStatus(config.instructions || "Analyzing requirements...");
    await new Promise((resolve) => setTimeout(resolve, 1500 * multiplier));
    
    if (config.selectedTools?.length > 0) {
      for (const tool of config.selectedTools) {
        onStatus(`Invoking ${tool.replace('_', ' ')}...`);
        await new Promise((resolve) => setTimeout(resolve, 800 * multiplier));
      }
    }

    return `[Analyst] Analyzed: ${task} (Format: ${config.outputFormat || "Default"})`;
  };

  const architect = async (task: string, onStatus: (s: string) => void, multiplier: number, config: any) => {
    onStatus(config.instructions || "Designing system architecture...");
    await new Promise((resolve) => setTimeout(resolve, 2000 * multiplier));

    if (config.selectedTools?.length > 0) {
      for (const tool of config.selectedTools) {
        onStatus(`Invoking ${tool.replace('_', ' ')}...`);
        await new Promise((resolve) => setTimeout(resolve, 800 * multiplier));
      }
    }

    return `[Architect] Designed: ${task} (Format: ${config.outputFormat || "Default"})`;
  };

  const coder = async (task: string, onStatus: (s: string) => void, multiplier: number, config: any) => {
    onStatus(config.instructions || "Writing core logic...");
    await new Promise((resolve) => setTimeout(resolve, 2500 * multiplier));

    if (config.selectedTools?.length > 0) {
      for (const tool of config.selectedTools) {
        onStatus(`Invoking ${tool.replace('_', ' ')}...`);
        await new Promise((resolve) => setTimeout(resolve, 800 * multiplier));
      }
    }

    return `[Coder] Code written for: ${task} (Format: ${config.outputFormat || "Default"})`;
  };

  const tester = async (task: string, onStatus: (s: string) => void, multiplier: number, config: any) => {
    onStatus(config.instructions || "Running unit tests...");
    await new Promise((resolve) => setTimeout(resolve, 1800 * multiplier));

    if (config.selectedTools?.length > 0) {
      for (const tool of config.selectedTools) {
        onStatus(`Invoking ${tool.replace('_', ' ')}...`);
        await new Promise((resolve) => setTimeout(resolve, 800 * multiplier));
      }
    }

    return `[Tester] Tested: ${task} (Format: ${config.outputFormat || "Default"})`;
  };

  const AGENTS: Record<string, (task: string, onStatus: (s: string) => void, multiplier: number, config: any) => Promise<string>> = {
    analyze: analyst,
    design: architect,
    code: coder,
    test: tester,
  };

  wss.on("connection", (ws) => {
    console.log("Client connected via WebSocket");

    ws.on("message", async (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "run") {
          const { prompt, config } = data;
          const speed = config?.speed || "normal";
          const agentsConfig = config?.agents || [];
          
          let multiplier = 1;
          if (speed === "fast") multiplier = 0.4;
          if (speed === "slow") multiplier = 2.5;

          const agentPromises = agentsConfig.map(async (agentConf: any) => {
            const agent = AGENTS[agentConf.id];
            if (agent) {
              const result = await agent(prompt, (status) => {
                ws.send(JSON.stringify({ type: "status", agent: agentConf.id, status }));
              }, multiplier, agentConf);
              ws.send(JSON.stringify({ type: "result", agent: agentConf.id, result }));
            }
          });

          await Promise.all(agentPromises);
          ws.send(JSON.stringify({ type: "done" }));
        }
      } catch (err) {
        console.error("WebSocket error:", err);
      }
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
