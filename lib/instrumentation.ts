import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import { AsyncLocalStorage } from 'async_hooks';

export type ToolProvider = 'tavily' | 'groq' | 'anthropic';
export type ToolStatus = 'success' | 'failure';

export interface ToolCallTrace {
  toolName: string;
  provider: ToolProvider;
  startTime: string;
  endTime: string;
  durationMs: number;
  estimatedCost: number;
  status: ToolStatus;
  error?: string;
}

export interface AgentRunTrace {
  city: string;
  startedAt: string;
  endedAt?: string;
  loopsRun: number;
  qualityScores: number[];
  toolCalls: ToolCallTrace[];
  finalProjectCount: number;
  timedOut?: boolean;
  budgetExceeded?: boolean;
  warning?: string;
}

interface TraceContext {
  trace: AgentRunTrace;
}

const storage = new AsyncLocalStorage<TraceContext>();

const ANTHROPIC_ESTIMATED_RATE_PER_TOKEN = 0.000003;
const TAVILY_SEARCH_COST = 0.004;
const GROQ_PARSE_COST = 0.0001;

export function getCurrentTrace(): AgentRunTrace | undefined {
  return storage.getStore()?.trace;
}

export async function withAgentTrace<T>(
  city: string,
  fn: (trace: AgentRunTrace) => Promise<T>,
): Promise<{ result: T; trace: AgentRunTrace }> {
  const trace: AgentRunTrace = {
    city,
    startedAt: new Date().toISOString(),
    loopsRun: 0,
    qualityScores: [],
    toolCalls: [],
    finalProjectCount: 0,
  };

  try {
    const result = await storage.run({ trace }, async () => fn(trace));
    trace.endedAt = new Date().toISOString();
    return { result, trace };
  } catch (err) {
    trace.endedAt = new Date().toISOString();
    throw err;
  }
}

function estimateCost(provider: ToolProvider, tokenCount?: number): number {
  switch (provider) {
    case 'anthropic': return (tokenCount ?? 0) * ANTHROPIC_ESTIMATED_RATE_PER_TOKEN;
    case 'tavily': return TAVILY_SEARCH_COST;
    case 'groq': return GROQ_PARSE_COST;
  }
}

export async function recordToolCall<T>(
  toolName: string,
  provider: ToolProvider,
  fn: () => Promise<T>,
  tokenCount?: number,
): Promise<T> {
  const trace = getCurrentTrace();
  const started = Date.now();
  const startTime = new Date(started).toISOString();

  try {
    const result = await fn();
    const ended = Date.now();
    trace?.toolCalls.push({
      toolName,
      provider,
      startTime,
      endTime: new Date(ended).toISOString(),
      durationMs: ended - started,
      estimatedCost: estimateCost(provider, tokenCount),
      status: 'success',
    });
    return result;
  } catch (err) {
    const ended = Date.now();
    trace?.toolCalls.push({
      toolName,
      provider,
      startTime,
      endTime: new Date(ended).toISOString(),
      durationMs: ended - started,
      estimatedCost: estimateCost(provider, tokenCount),
      status: 'failure',
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

export function totalTraceCost(trace: AgentRunTrace): number {
  return trace.toolCalls.reduce((sum, call) => sum + call.estimatedCost, 0);
}

export function totalTraceDurationMs(trace: AgentRunTrace): number {
  if (!trace.endedAt) return Date.now() - Date.parse(trace.startedAt);
  return Date.parse(trace.endedAt) - Date.parse(trace.startedAt);
}

export function summarizeToolCalls(trace: AgentRunTrace): string {
  const groups = new Map<string, { count: number; durationMs: number }>();
  for (const call of trace.toolCalls) {
    const group = groups.get(call.toolName) ?? { count: 0, durationMs: 0 };
    group.count += 1;
    group.durationMs += call.durationMs;
    groups.set(call.toolName, group);
  }

  return Array.from(groups.entries())
    .map(([tool, group]) => `${tool} x${group.count} (${(group.durationMs / 1000).toFixed(1)}s)`)
    .join(', ');
}

export function logTraceSummary(trace: AgentRunTrace): void {
  console.log(
    `[TRACE] Agent run complete: ${trace.loopsRun} loops, ${trace.toolCalls.length} tool calls, ${(totalTraceDurationMs(trace) / 1000).toFixed(1)}s total, $${totalTraceCost(trace).toFixed(2)} cost`,
  );
  console.log(`[TRACE] Tools: ${summarizeToolCalls(trace) || 'none'}`);
}

export async function saveAgentTrace(trace: AgentRunTrace): Promise<string> {
  const tracesDir = join(process.cwd(), 'data', 'traces');
  await mkdir(tracesDir, { recursive: true });

  const stamp = (trace.endedAt ?? new Date().toISOString()).replace(/[:.]/g, '-');
  const path = join(tracesDir, `${stamp}.json`);
  await writeFile(path, JSON.stringify(trace, null, 2), 'utf-8');
  return path;
}
