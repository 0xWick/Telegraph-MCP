export interface TelegraphConfig {
  nodeUrl: string;
  engineUrl: string;
  daemonUrl: string;
  evmPrivateKey?: string;
  solanaPrivateKey?: string;
  evmNetwork: `${string}:${string}`;
  svmNetwork: `${string}:${string}`;
  refreshIntervalMs: number;
  transport: "stdio";
}

export interface Integration {
  id: string;
  slug: string;
  kind: string;
  protocol: string;
  name: string;
  description: string;
  endpoints: Endpoint[];
  signal_mapping?: SignalMapping;
  input_schema?: Record<string, unknown>;
  output_schema?: Record<string, unknown>;
  base_url?: string;
  auth?: AuthConfig;
  semantics?: SemanticsConfig;
}

export interface Endpoint {
  path: string;
  method: string;
  description: string;
  external_path?: string;
  multipart_fields?: string[];
  param_map?: Record<string, string>;
  content_type?: string;
}

export interface AuthConfig {
  type: string;
  env_var?: string;
  header_name?: string;
}

export interface SemanticsConfig {
  signal_mapping?: SignalMapping;
  supported_intents?: string[];
}

export interface SignalMapping {
  type: string;
  confidence_field?: string;
  label_field?: string;
  reason_field?: string;
}

export interface EngineSubnet {
  id: string;
  name: string;
  slug: string;
  description: string;
  base_url: string;
  capabilities: string[];
  cost_per_call: string;
  protocol: string;
}

export interface DaemonHealth {
  status: string;
  time: string;
}

export interface DaemonCategory {
  category: string;
  count: number;
  avg_interest: number;
  max_interest: number;
}
