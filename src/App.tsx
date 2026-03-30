import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Bot, Send, Loader2, CheckCircle2, Code, Layout, Search, Zap, Settings, X, Sliders, ToggleLeft, ToggleRight, Sparkles } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

interface AgentState {
  status: string;
  result?: string;
  isComplete: boolean;
}

interface AgentConfig {
  id: string;
  name: string;
  enabled: boolean;
  instructions?: string;
  outputFormat?: string;
  selectedTools: string[];
}

const AVAILABLE_TOOLS = [
  { id: "web_search", name: "Web Search", icon: <Search className="w-3.5 h-3.5" /> },
  { id: "code_interpreter", name: "Code Interpreter", icon: <Code className="w-3.5 h-3.5" /> },
  { id: "file_analyzer", name: "File Analyzer", icon: <Layout className="w-3.5 h-3.5" /> },
  { id: "data_visualizer", name: "Data Visualizer", icon: <Zap className="w-3.5 h-3.5" /> },
];

interface AppSettings {
  speed: "fast" | "normal" | "slow";
  agents: AgentConfig[];
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const [loading, setLoading] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>({
    speed: "normal",
    agents: [
      { id: "analyze", name: "Analyst", enabled: true, instructions: "Focus on edge cases and scalability.", outputFormat: "Bullet points", selectedTools: ["web_search"] },
      { id: "design", name: "Architect", enabled: true, instructions: "Use microservices patterns.", outputFormat: "Component list", selectedTools: ["file_analyzer"] },
      { id: "code", name: "Coder", enabled: true, instructions: "Follow clean code principles.", outputFormat: "Pseudo-code", selectedTools: ["code_interpreter"] },
      { id: "test", name: "Tester", enabled: true, instructions: "Emphasize security testing.", outputFormat: "Test cases", selectedTools: ["code_interpreter", "web_search"] },
    ]
  });
  
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === "status") {
        setAgents(prev => ({
          ...prev,
          [data.agent]: {
            ...prev[data.agent],
            status: data.status,
            isComplete: false
          }
        }));
      } else if (data.type === "result") {
        setAgents(prev => ({
          ...prev,
          [data.agent]: {
            ...prev[data.agent],
            result: data.result,
            status: "Task Completed",
            isComplete: true
          }
        }));
      } else if (data.type === "done") {
        setLoading(false);
      }
    };

    socketRef.current = socket;
    return () => socket.close();
  }, []);

  const enhancePrompt = async () => {
    if (!prompt.trim() || isEnhancing) return;
    
    setIsEnhancing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Enhance the following prompt to be more detailed, structured, and effective for a multi-agent AI system. Focus on clarity, specific requirements, and desired outcomes. Keep it concise but comprehensive.
        
        Original Prompt: "${prompt}"
        
        Enhanced Prompt:`,
      });
      
      if (response.text) {
        setPrompt(response.text.trim());
      }
    } catch (error) {
      console.error("Failed to enhance prompt:", error);
    } finally {
      setIsEnhancing(false);
    }
  };

  const runAI = () => {
    if (!prompt.trim() || !socketRef.current) return;
    
    const enabledAgentIds = settings.agents.filter(a => a.enabled).map(a => a.id);
    if (enabledAgentIds.length === 0) {
      alert("Please enable at least one agent in settings.");
      return;
    }

    setLoading(true);
    const initialAgents: Record<string, AgentState> = {};
    enabledAgentIds.forEach(id => {
      initialAgents[id] = { status: "Waiting...", isComplete: false };
    });
    setAgents(initialAgents);

    socketRef.current.send(JSON.stringify({ 
      type: "run", 
      prompt,
      config: {
        speed: settings.speed,
        agents: settings.agents.filter(a => a.enabled)
      }
    }));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "analyze": return <Search className="w-5 h-5 text-blue-400" />;
      case "design": return <Layout className="w-5 h-5 text-purple-400" />;
      case "code": return <Code className="w-5 h-5 text-green-400" />;
      case "test": return <CheckCircle2 className="w-5 h-5 text-orange-400" />;
      default: return <Bot className="w-5 h-5 text-gray-400" />;
    }
  };

  const toggleAgent = (id: string) => {
    setSettings(prev => ({
      ...prev,
      agents: prev.agents.map(a => a.id === id ? { ...a, enabled: !a.enabled } : a)
    }));
  };

  const agentOrder = settings.agents.map(a => a.id);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans selection:bg-blue-500/30">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <header className="mb-12 flex items-center justify-between">
          <div className="text-left">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-4"
            >
              <Zap className="w-4 h-4 fill-blue-400" />
              <span>Real-time Multi-Agent System</span>
            </motion.div>
            <motion.h1 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-5xl font-bold tracking-tight bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent"
            >
              Live Orchestration
            </motion.h1>
          </div>
          <button 
            onClick={() => setShowSettings(true)}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
          >
            <Settings className="w-6 h-6 text-gray-400" />
          </button>
        </header>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group mb-12"
        >
          <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl blur opacity-20 group-hover:opacity-30 transition duration-1000"></div>
          <div className="relative bg-[#141414] border border-white/10 rounded-2xl p-4">
            <textarea
              className="w-full bg-transparent border-none focus:ring-0 text-lg placeholder:text-gray-600 resize-none min-h-[120px]"
              placeholder="Describe your goal (e.g., 'Build a secure authentication system')"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.metaKey) runAI();
              }}
            />
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
              <div className="flex items-center gap-4">
                <span className="text-xs text-gray-500">Press ⌘ + Enter to run</span>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/5">
                  <Sliders className="w-3 h-3 text-gray-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">{settings.speed} speed</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={enhancePrompt}
                  disabled={isEnhancing || loading || !prompt.trim()}
                  className="flex items-center gap-2 bg-white/5 text-gray-300 border border-white/10 px-4 py-2.5 rounded-xl font-medium hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                  title="Enhance prompt with AI"
                >
                  {isEnhancing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Enhancing...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-blue-400" />
                      <span>Enhance</span>
                    </>
                  )}
                </button>
                <button
                  onClick={runAI}
                  disabled={loading || !prompt.trim() || isEnhancing}
                  className="flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Orchestrating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Run Agents</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {agentOrder.map((type) => {
              const agent = agents[type];
              if (!agent) return null;

              return (
                <motion.div
                  key={type}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`group relative flex items-start gap-4 p-5 rounded-2xl transition-all border ${
                    agent.isComplete 
                      ? "bg-white/[0.03] border-white/5" 
                      : "bg-blue-500/[0.02] border-blue-500/10 shadow-[0_0_20px_rgba(59,130,246,0.05)]"
                  }`}
                >
                  <div className={`mt-1 p-2 rounded-lg transition-colors ${
                    agent.isComplete ? "bg-white/5" : "bg-blue-500/10 animate-pulse"
                  }`}>
                    {getIcon(type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <div className="text-sm font-medium text-gray-500 uppercase tracking-wider">
                        {type} Agent
                      </div>
                      {!agent.isComplete && (
                        <div className="flex items-center gap-2">
                          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-ping"></span>
                          <span className="text-[10px] font-bold text-blue-500 uppercase">Live</span>
                        </div>
                      )}
                    </div>
                    <div className={`text-lg transition-colors ${agent.isComplete ? "text-gray-400 font-normal" : "text-blue-400 font-medium"}`}>
                      {agent.status}
                    </div>
                    {agent.result && (
                      <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="mt-3 pt-3 border-t border-white/5 text-gray-200 leading-relaxed"
                      >
                        {agent.result.split(']')[1].trim()}
                      </motion.div>
                    )}
                  </div>
                </motion.div>
              );
            })}

            {/* Final Consolidated Result */}
            {!loading && Object.values(agents).some((a: AgentState) => a.isComplete) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-12 p-8 rounded-3xl bg-gradient-to-br from-blue-600/20 to-purple-600/20 border border-white/10 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Zap className="w-24 h-24 text-white" />
                </div>
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <CheckCircle2 className="w-6 h-6 text-green-400" />
                    Final Orchestration Result
                  </h3>
                  <div className="space-y-4 text-gray-300 leading-relaxed">
                    <p>
                      The multi-agent system has successfully processed your request: 
                      <span className="text-white font-medium italic ml-1">"{prompt}"</span>
                    </p>
                    <div className="bg-black/40 rounded-2xl p-6 border border-white/5 font-mono text-sm">
                      <div className="text-blue-400 mb-2">// Consolidated Output</div>
                      {agentOrder.map(type => {
                        const res = agents[type]?.result;
                        if (!res) return null;
                        return (
                          <div key={type} className="mb-2 last:mb-0">
                            <span className="text-gray-500">{type}:</span> {res.split(']')[1].trim()}
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-sm text-gray-500">
                      Orchestration completed with {settings.agents.filter(a => a.enabled).length} agents at {settings.speed} speed.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          {!loading && Object.keys(agents).length === 0 && (
            <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-3xl">
              <Bot className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <p className="text-gray-600">Enter a prompt to see the agents in action.</p>
            </div>
          )}
        </div>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-[#141414] border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <Sliders className="w-6 h-6 text-blue-500" />
                  Orchestration Settings
                </h2>
                <button 
                  onClick={() => setShowSettings(false)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-8">
                <div>
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 block">
                    Response Speed
                  </label>
                  <div className="grid grid-cols-3 gap-2 p-1 bg-white/5 rounded-xl border border-white/5">
                    {(["fast", "normal", "slow"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSettings(prev => ({ ...prev, speed: s }))}
                        className={`py-2 rounded-lg text-sm font-medium capitalize transition-all ${
                          settings.speed === s 
                            ? "bg-white text-black shadow-lg" 
                            : "text-gray-500 hover:text-white"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4 block">
                    Agent Configuration
                  </label>
                  <div className="space-y-3">
                    {settings.agents.map((agent) => (
                      <div 
                        key={agent.id}
                        className="rounded-2xl bg-white/[0.03] border border-white/5 overflow-hidden transition-all"
                      >
                        <div 
                          onClick={() => toggleAgent(agent.id)}
                          className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/[0.05] transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-white/5">
                              {getIcon(agent.id)}
                            </div>
                            <span className="font-medium">{agent.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedAgent(expandedAgent === agent.id ? null : agent.id);
                              }}
                              className={`p-1.5 rounded-lg transition-colors ${expandedAgent === agent.id ? "bg-blue-500/20 text-blue-400" : "hover:bg-white/5 text-gray-500"}`}
                            >
                              <Sliders className="w-4 h-4" />
                            </button>
                            {agent.enabled ? (
                              <ToggleRight className="w-8 h-8 text-blue-500" />
                            ) : (
                              <ToggleLeft className="w-8 h-8 text-gray-600" />
                            )}
                          </div>
                        </div>
                        
                        <AnimatePresence>
                          {expandedAgent === agent.id && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="px-4 pb-4 space-y-4 border-t border-white/5 pt-4"
                            >
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Instructions</label>
                                <textarea 
                                  value={agent.instructions}
                                  onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    agents: prev.agents.map(a => a.id === agent.id ? { ...a, instructions: e.target.value } : a)
                                  }))}
                                  className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-blue-500/50 outline-none min-h-[80px]"
                                  placeholder="Specific instructions for this agent..."
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Output Format</label>
                                <input 
                                  type="text"
                                  value={agent.outputFormat}
                                  onChange={(e) => setSettings(prev => ({
                                    ...prev,
                                    agents: prev.agents.map(a => a.id === agent.id ? { ...a, outputFormat: e.target.value } : a)
                                  }))}
                                  className="w-full bg-black/40 border border-white/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-blue-500/50 outline-none"
                                  placeholder="e.g. JSON, Markdown"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Integrated Tools</label>
                                <div className="grid grid-cols-2 gap-2">
                                  {AVAILABLE_TOOLS.map(tool => (
                                    <button
                                      key={tool.id}
                                      onClick={() => {
                                        setSettings(prev => ({
                                          ...prev,
                                          agents: prev.agents.map(a => {
                                            if (a.id !== agent.id) return a;
                                            const selectedTools = a.selectedTools.includes(tool.id)
                                              ? a.selectedTools.filter(t => t !== tool.id)
                                              : [...a.selectedTools, tool.id];
                                            return { ...a, selectedTools };
                                          })
                                        }));
                                      }}
                                      className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition-all ${
                                        agent.selectedTools.includes(tool.id)
                                          ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                                          : "bg-black/40 border-white/5 text-gray-400 hover:bg-white/5"
                                      }`}
                                    >
                                      {tool.icon}
                                      {tool.name}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-8 bg-white text-black py-4 rounded-2xl font-bold hover:bg-gray-200 transition-all active:scale-[0.98]"
              >
                Save Configuration
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
