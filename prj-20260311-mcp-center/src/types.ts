import { z } from 'zod';

export const MCPServerConfigSchema = z.object({
  name: z.string(),
  command: z.string().optional(),
  args: z.array(z.string()).optional(),
  url: z.string().optional(),
  env: z.record(z.string()).optional(),
  enabledTools: z.array(z.string()).optional(),
});

export type MCPServerConfig = z.infer<typeof MCPServerConfigSchema>;

export const MCPConfigSchema = z.object({
  servers: z.array(MCPServerConfigSchema),
});

export type MCPConfig = z.infer<typeof MCPConfigSchema>;

export interface ToolInfo {
  name: string;
  originalName: string;
  serverName: string;
  description: string;
  inputSchema: object;
}

export interface LoadedServer {
  name: string;
  client: any;
  tools: ToolInfo[];
}
