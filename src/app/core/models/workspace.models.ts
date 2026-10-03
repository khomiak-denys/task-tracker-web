export interface Workspace {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly description: string;
  readonly role: 'Owner' | 'Admin' | 'Contributor' | 'Reader';
  readonly memberCount: number;
  readonly taskCount: number;
  readonly color: string;
  readonly isDefault?: boolean;
}

export const MOCK_WORKSPACES: Workspace[] = [
  {
    id: 'ws-arch-core',
    name: 'Architecture Lab Core',
    code: 'ARCH',
    description: 'Clean architecture microservices, domain events & Aspire orchestrator',
    role: 'Owner',
    memberCount: 8,
    taskCount: 6,
    color: '#0078D4',
    isDefault: true,
  },
  {
    id: 'ws-frontend-web',
    name: 'Frontend Web Portal',
    code: 'WEB',
    description: 'Angular 20 OnPush client, Azure DevOps board & design system',
    role: 'Admin',
    memberCount: 12,
    taskCount: 14,
    color: '#107C10',
  },
  {
    id: 'ws-gateway-security',
    name: 'API Gateway & Security',
    code: 'GW',
    description: 'YARP reverse proxy, JWT refresh rotation & policy enforcements',
    role: 'Contributor',
    memberCount: 5,
    taskCount: 4,
    color: '#5C2D91',
  },
  {
    id: 'ws-infra-devops',
    name: 'DevOps & Telemetry',
    code: 'OPS',
    description: 'Docker compose, OpenTelemetry distributed traces & CI/CD',
    role: 'Reader',
    memberCount: 4,
    taskCount: 3,
    color: '#D83B01',
  },
];
