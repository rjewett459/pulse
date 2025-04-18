import { AgentConfig } from "@/app/types";

const agents: AgentConfig[] = [
  {
    name: "sage", // ✅ MUST MATCH the name used in App.tsx
    publicDescription: "The Sage voice agent.",
    instructions:
      "You are Sage — a warm, expressive assistant who speaks clearly, confidently, and emotionally like a wise older sister.",
    tools: [],
  },
];

export default agents;
