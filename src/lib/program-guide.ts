import { ProgramSection } from './types';

export const PROGRAM_SECTIONS: ProgramSection[] = [
  {
    id: '1.0',
    title: 'Partner Overview',
    description: 'This section assesses the partner organization profile, service offerings, Google Cloud business relationship, and resource management.',
    evidenceItems: [],
    children: [
      {
        id: '1.1',
        title: 'General',
        description: 'General information about the partner organization.',
        evidenceItems: [],
        children: [
          {
            id: '1.1.1',
            title: 'Company Overview',
            description: 'The MSP partner must provide a company overview including: general profile (history, structure, competitive differentiators), countries/regions served, sales and support delivery offices for Google Cloud Managed Services, number of employees (total and dedicated to GC Managed Services), industry focus and customer profile, and scale of managed services as a percentage of business volume and customer count.',
            evidenceItems: [
              { id: '1.1.1-E1', text: 'Presentation covering company general profile: history, structure, and competitive differentiators', isRenewal: true, status: 'not-checked' },
              { id: '1.1.1-E2', text: 'Countries or regions served, sales offices, and support delivery offices for Google Cloud Managed Services', isRenewal: true, status: 'not-checked' },
              { id: '1.1.1-E3', text: 'Number of employees in the company and employees dedicated to Google Cloud Managed Services', isRenewal: true, status: 'not-checked' },
              { id: '1.1.1-E4', text: 'Industry focus and customer profile', isRenewal: true, status: 'not-checked' },
              { id: '1.1.1-E5', text: 'Scale of managed services as a percentage of business volume and customer count', isRenewal: true, status: 'not-checked' },
              { id: '1.1.1-E6', text: 'A 15-minute presentation covering all subjects above delivered at the start of the assessment', isRenewal: true, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '1.2',
        title: 'Service Offerings / Core Technical Competencies',
        description: 'Partner managed services value proposition, offerings, support team, and account management structure.',
        evidenceItems: [],
        children: [
          {
            id: '1.2.1',
            title: 'Managed Service Offerings',
            description: 'Partners must provide details about their managed services value proposition including offerings, support team, and account management structure. Must cover how support provides additional value over Google Cloud direct support, specifics of offerings, support packages, team structure, key personnel, account management strategy, and additional capabilities.',
            evidenceItems: [
              { id: '1.2.1-E1', text: 'A 30-minute presentation with overview of managed services value proposition, lifecycle from lead to decommission', isRenewal: false, status: 'not-checked' },
              { id: '1.2.1-E2', text: 'Organizational structure of support teams, professional services teams, and account management teams', isRenewal: false, status: 'not-checked' },
              { id: '1.2.1-E3', text: 'Documentation around additional managed offers beyond the platform', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '1.2.2',
            title: 'Core Technical Competencies',
            description: 'Partner must describe core technical competencies including: cloud migration, containerization, big data and analytics, DevOps, and AI/generative AI.',
            evidenceItems: [
              { id: '1.2.2-E1', text: 'Overview presentation of capabilities in core technical competencies (migration, containers, big data, DevOps, AI)', isRenewal: true, status: 'not-checked' },
              { id: '1.2.2-E2', text: 'Customer case studies or evidence of service delivery leveraging Google Cloud products', isRenewal: true, status: 'not-checked' },
              { id: '1.2.2-E3', text: 'Documentation showing approach to onboarding resources to develop core technical competencies', isRenewal: true, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '1.3',
        title: 'Google Cloud Business',
        description: 'Assessment of partner\'s Google Cloud business alignment, web presence, customer success, and retention.',
        evidenceItems: [],
        children: [
          {
            id: '1.3.1',
            title: 'Google Business Alignment',
            description: 'Partner must have a dedicated Google Cloud Alliance Leader to develop a Joint Business Plan with personnel aligned to Google including: Alliance Leader, Technical Support Ops Leader, Sales Leader, Sales Ops, Executive Sponsor, Marketing, Engineering Leader.',
            evidenceItems: [
              { id: '1.3.1-E1', text: 'Documentation with listed personnel including title, locations, contact info, and dedication status to Google Cloud MSP practice', isRenewal: true, status: 'not-checked' },
              { id: '1.3.1-E2', text: 'Google Cloud joint business plan covering key business initiatives and areas of focus', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '1.3.2',
            title: 'Google Cloud Managed Services Web Presence',
            description: 'Partner must have a web page dedicated to Google Cloud Managed Services business practice area.',
            evidenceItems: [
              { id: '1.3.2-E1', text: 'URL for dedicated Google Cloud Managed Services web page with validated content', isRenewal: true, status: 'not-checked' },
              { id: '1.3.2-E2', text: 'At least two customer references of Google Cloud Managed Services on the website', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '1.3.3',
            title: 'Customer Success',
            description: 'Utilizing Google\'s Partner Program portal, achieve at least 2 Service registrations with managed services in-scope, applicable GCP project numbers, and Product category: Google Cloud Platform.',
            evidenceItems: [
              { id: '1.3.3-E1', text: 'At least 2 service registrations with managed services in-scope and engagement details clearly articulated', isRenewal: false, status: 'not-checked' },
              { id: '1.3.3-E2', text: 'Applicable GCP project number(s) noted with Product category: Google Cloud Platform', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '1.3.4',
            title: 'Customer Retention',
            description: 'Partner must provide evidence of customers retained for longer than a year, and demonstrate steps to mitigate churn risks with a cohesive process for customer downgrade.',
            evidenceItems: [
              { id: '1.3.4-E1', text: 'Example of one managed service customer support contract demonstrating at least one continuous year of GC managed services', isRenewal: true, status: 'not-checked' },
              { id: '1.3.4-E2', text: 'Established documented process or workflow for responding to, mitigating, and processing customer churn events', isRenewal: false, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '1.4',
        title: 'Resource Management',
        description: 'Capacity planning and resource management for managed service delivery.',
        evidenceItems: [],
        children: [
          {
            id: '1.4.1',
            title: 'Capacity Planning Process',
            description: 'Partner must have a capacity planning process to ensure appropriate staffing and resources are available for managed service offerings.',
            evidenceItems: [
              { id: '1.4.1-E1', text: 'Description or records of capacity planning activities including resources for cloud enablement, migration planning, design/deployment, and service delivery operations', isRenewal: false, status: 'not-checked' },
            ],
          },
        ],
      },
    ],
  },
  {
    id: '2.0',
    title: 'Operations and Support',
    description: 'This section assesses operational capabilities including customer support, logging, ticketing, incident management, change management, access management, SLAs, and reporting.',
    evidenceItems: [],
    children: [
      {
        id: '2.1',
        title: 'Customer Support Model',
        description: 'Assessment of the partner\'s 24x7x365 support model, staffing, tiers, and post-migration handoff.',
        evidenceItems: [],
        children: [
          {
            id: '2.1.1',
            title: 'Support Model (24x7x365)',
            description: 'Partner must have a 24x7x365 support model with four priority levels: P1 (Critical), P2 (High), P3 (Medium), P4 (Low).',
            evidenceItems: [
              { id: '2.1.1-E1', text: 'Process documentation on how priority levels are determined, applied, and SLA/SLO defined', isRenewal: true, status: 'not-checked' },
              { id: '2.1.1-E2', text: 'Documentation defining managed services support team structure and model across all regions/offices including staffing strategy and headcount', isRenewal: true, status: 'not-checked' },
              { id: '2.1.1-E3', text: 'Staffing records demonstrating each support tier is staffed with certified FTEs 24x7x365', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '2.1.2',
            title: 'Support Personnel Staffing and Qualifications',
            description: 'Support model must be staffed by personnel with Google Cloud certifications. Must maintain at least 12 FTEs with valid Professional Cloud Architect certification designated to presales and MSP delivery.',
            evidenceItems: [
              { id: '2.1.2-E1', text: 'Valid Professional Cloud Architect certification records for at least 12 FTEs in the MSP practice', isRenewal: true, status: 'not-checked' },
              { id: '2.1.2-E2', text: 'Documented confirmation that certified individuals are accessible as escalation points', isRenewal: true, status: 'not-checked' },
              { id: '2.1.2-E3', text: 'Documented plan for Google Cloud education and certification path for team members', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.1.3',
            title: 'Support Tiers',
            description: 'Partner must offer tiered support (Tier 1, 2, 3 or customizable) mapped to priority levels P1-P4.',
            evidenceItems: [
              { id: '2.1.3-E1', text: 'Customer-facing documentation showing support tiers mapped to priority levels (P1-P4)', isRenewal: false, status: 'not-checked' },
              { id: '2.1.3-E2', text: 'Customer-facing documentation describing support hours', isRenewal: false, status: 'not-checked' },
              { id: '2.1.3-E3', text: 'Customer-facing documentation with expected SLA/SLOs for each priority level', isRenewal: true, status: 'not-checked' },
              { id: '2.1.3-E4', text: 'Customer-facing documentation explaining how to reach out for support', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.1.4',
            title: 'Post-Migration Hand-Off to Support Services',
            description: 'Partner must have a documented process for transitioning from assessment/design/migration/deployment to managed services ongoing support.',
            evidenceItems: [
              { id: '2.1.4-E1', text: 'Documentation showing hand-off process for two customer solutions delivered in last 24 months, from Professional Services to Managed Services, including design/migration phases and support plan', isRenewal: true, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.2',
        title: 'Logging and Retention',
        description: 'Event logging capabilities, retention policies, log access, and data mining.',
        evidenceItems: [],
        children: [
          {
            id: '2.2.1',
            title: 'Event Logging',
            description: 'Partner must have tools/technologies for logging events at infrastructure and/or application layers (e.g., Google Cloud operations suite, Cloud Logging).',
            evidenceItems: [
              { id: '2.2.1-E1', text: 'Evidence of event-logging capabilities including collection from servers, containers, network devices, storage systems (infrastructure) OR databases, app servers, SaaS (application logging), with storage and correlation', isRenewal: true, status: 'not-checked' },
              { id: '2.2.1-E2', text: 'Workflow documentation on how captured events cause actions (auto-remediation or case reports)', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.2.2',
            title: 'Retention Policy',
            description: 'Partner must have a log retention policy with compliance process.',
            evidenceItems: [
              { id: '2.2.2-E1', text: 'Documented log retention policy and records of compliance', isRenewal: true, status: 'not-checked' },
              { id: '2.2.2-E2', text: 'Documentation of retention policy for infrastructure and application layer logging', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '2.2.3',
            title: 'Log Access',
            description: 'Partner must make logs accessible to the customer.',
            evidenceItems: [
              { id: '2.2.3-E1', text: 'Demonstrate logs are provided to customers including methods to provide access', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.2.4',
            title: 'Log Data Mining',
            description: 'Partner must mine log collections for root cause analysis and process optimization.',
            evidenceItems: [
              { id: '2.2.4-E1', text: 'Records of data analysis activities and examples of improvement recommendations', isRenewal: false, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.3',
        title: 'Ticketing System',
        description: 'Ticketing system for receiving, tracking, and logging service requests.',
        evidenceItems: [],
        children: [
          {
            id: '2.3.1',
            title: 'Ticketing Tool',
            description: 'Partner must have a ticketing system (in-house or third-party) to receive, track, and log service requests.',
            evidenceItems: [
              { id: '2.3.1-E1', text: 'Technology demonstration of ticketing system showing: products/tools for service requests, ability to access previous requests for correlation, and audit trail of MSP tasks', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '2.3.2',
            title: 'Case/Request Handling',
            description: 'Process for receiving, acknowledging, and recording customer requests per SLOs.',
            evidenceItems: [
              { id: '2.3.2-E1', text: 'Demonstration of how support requests are received, acknowledged, and logged/timestamped', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.3.3',
            title: 'Case/Request Prioritization',
            description: 'Prioritize and manage requests according to tiered support model (ref 2.1.3).',
            evidenceItems: [
              { id: '2.3.3-E1', text: 'Examples of prioritized requests in the ticketing system', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.3.4',
            title: 'Case Escalation',
            description: 'Process for escalation including to Google Cloud Support and internal escalation paths.',
            evidenceItems: [
              { id: '2.3.4-E1', text: 'Documented escalation process with at least one example executed in last 12 months', isRenewal: true, status: 'not-checked' },
              { id: '2.3.4-E2', text: 'Documentation for internal escalation process within partner teams', isRenewal: false, status: 'not-checked' },
              { id: '2.3.4-E3', text: 'Documentation for escalation process to Google Cloud Support', isRenewal: false, status: 'not-checked' },
              { id: '2.3.4-E4', text: 'Example of customer-facing information on how to escalate cases', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.3.5',
            title: 'Case/Request Resolution',
            description: 'Processes for resolution of customer cases including bug/feature requests and service unavailability.',
            evidenceItems: [
              { id: '2.3.5-E1', text: 'Records of case status and resolution', isRenewal: false, status: 'not-checked' },
              { id: '2.3.5-E2', text: 'Process documentation for how MSP team handles case resolution', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.3.6',
            title: 'Time of Response/Resolution',
            description: 'Track case response and resolution time at each priority level for each tier.',
            evidenceItems: [
              { id: '2.3.6-E1', text: 'At least six months aggregate tracking showing Mean Time to Response metric', isRenewal: true, status: 'not-checked' },
              { id: '2.3.6-E2', text: 'Description of actions taken in response to these metrics', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.3.7',
            title: 'Customer Verification',
            description: 'Processes allowing customers to verify successful resolution of cases.',
            evidenceItems: [
              { id: '2.3.7-E1', text: 'Records of customer verification of case resolution', isRenewal: true, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.4',
        title: 'Incident Management',
        description: 'Incident identification, recording, and management processes.',
        evidenceItems: [],
        children: [
          {
            id: '2.4.1',
            title: 'Incident Management Process',
            description: 'Process for identifying and recording service-impacting incidents.',
            evidenceItems: [
              { id: '2.4.1-E1', text: 'Documented process for incident management including how service-impacting incidents are filtered from all recorded events', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '2.4.2',
            title: 'Incident Management Records',
            description: 'Partner must maintain records of identified incidents.',
            evidenceItems: [
              { id: '2.4.2-E1', text: 'Examples of identified incidents including examples where incident info was communicated to customers', isRenewal: true, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.5',
        title: 'Problem Management',
        description: 'Problem identification, recording, and resolution processes.',
        evidenceItems: [],
        children: [
          {
            id: '2.5.1',
            title: 'Problem Management Process',
            description: 'Process for identifying and recording problems from incidents with no known cause or proactive monitoring.',
            evidenceItems: [
              { id: '2.5.1-E1', text: 'Documented process for problem management and examples of problem records', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '2.5.2',
            title: 'Problem Management Records',
            description: 'Partner must maintain records of problem management activities.',
            evidenceItems: [
              { id: '2.5.2-E1', text: 'Examples of problem management including identification, logging, analysis, and entry into Known Errors Database (KEDB)', isRenewal: true, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.6',
        title: 'Asset Management',
        description: 'Strategy for tracking and managing deployed Google Cloud assets.',
        evidenceItems: [],
        children: [
          {
            id: '2.6.1',
            title: 'Asset Management Strategy and Records',
            description: 'Partner must have a strategy for tracking and managing deployed Google Cloud assets beyond the Google Cloud Console.',
            evidenceItems: [
              { id: '2.6.1-E1', text: 'Technology demonstration of how partner tracks and manages deployed Google Cloud assets', isRenewal: true, status: 'not-checked' },
              { id: '2.6.1-E2', text: 'Documentation demonstrating a clear deployment strategy for managed services customers', isRenewal: true, status: 'not-checked' },
              { id: '2.6.1-E3', text: 'Documentation or technology demonstration showing how the partner keeps record of deployed assets', isRenewal: false, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.7',
        title: 'Configuration and Change Management',
        description: 'Processes for configuration and change management including server images, instance configuration, patches, security groups, and versioning.',
        evidenceItems: [],
        children: [
          {
            id: '2.7.1',
            title: 'Configuration and Change Management Processes',
            description: 'Processes for configuration and change management including: server image management, instance configuration, patches/upgrades, security groups/firewalls, and versioning/rollback.',
            evidenceItems: [
              { id: '2.7.1-E1', text: 'Technology demonstration with examples of configuration management activities', isRenewal: false, status: 'not-checked' },
              { id: '2.7.1-E2', text: 'Documented change management process', isRenewal: false, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.8',
        title: 'Release and Deployment Management',
        description: 'Processes for release and deployment of applications/workloads.',
        evidenceItems: [],
        children: [
          {
            id: '2.8.1',
            title: 'Release and Deployment Management Processes',
            description: 'Release scope, stakeholders, release plan, testing in staging, production deployment with monitoring, and rollback process.',
            evidenceItems: [
              { id: '2.8.1-E1', text: 'Documented processes for release and deployment management with technology demonstration', isRenewal: false, status: 'not-checked' },
            ],
          },
          {
            id: '2.8.2',
            title: 'Deployment Tooling',
            description: 'Partner must utilize self-service tooling or managed CI/CD pipelines for deployment automation.',
            evidenceItems: [
              { id: '2.8.2-E1', text: 'Documentation or demonstration of self-service tooling and/or managed CI/CD pipelines for deployment', isRenewal: false, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.9',
        title: 'Access Management',
        description: 'Management of partner access to customer infrastructure and customer access to Google Cloud.',
        evidenceItems: [],
        children: [
          {
            id: '2.9.1',
            title: 'Partner Access to Customer Infrastructure',
            description: 'Partner must document how they achieve required access to customer infrastructure.',
            evidenceItems: [
              { id: '2.9.1-E1', text: 'Documentation on how access to customer infrastructure is achieved', isRenewal: true, status: 'not-checked' },
              { id: '2.9.1-E2', text: 'Definitions of what level of access is achieved', isRenewal: true, status: 'not-checked' },
              { id: '2.9.1-E3', text: 'Documentation on time limitations configured for access', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '2.9.2',
            title: 'Customer Access to Google Cloud',
            description: 'Partner must define the level of Google Cloud access provided to customers.',
            evidenceItems: [
              { id: '2.9.2-E1', text: 'Documentation of IAM policy and processes for customer access to Google Cloud', isRenewal: true, status: 'not-checked' },
              { id: '2.9.2-E2', text: 'Demonstration of tooling for directory integration, user management, and access management', isRenewal: true, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.10',
        title: 'Service Level Agreements',
        description: 'Support SLAs specific to Google Cloud services and products.',
        evidenceItems: [],
        children: [
          {
            id: '2.10.1',
            title: 'Support SLAs',
            description: 'Partner must provide support SLAs specific to Google Cloud services and products, plus additional SLAs for core technical competencies.',
            evidenceItems: [
              { id: '2.10.1-E1', text: 'Support SLAs specific to Google Cloud Managed Services in signed customer contracts', isRenewal: true, status: 'not-checked' },
              { id: '2.10.1-E2', text: 'Documentation on additional SLAs for partner-specific competencies', isRenewal: false, status: 'not-checked' },
            ],
          },
        ],
      },
      {
        id: '2.11',
        title: 'Reporting',
        description: 'Performance analysis, asset/usage, and cost reporting to customers.',
        evidenceItems: [],
        children: [
          {
            id: '2.11.1',
            title: 'Performance Analysis Reporting',
            description: 'Performance analysis reporting identifying areas for efficiency improvement or performance degradation, including alerts and notifications.',
            evidenceItems: [
              { id: '2.11.1-E1', text: 'Example Performance Analysis Reports provided to customers including tools, sources, and metrics', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '2.11.2',
            title: 'Asset/Usage Reporting',
            description: 'Asset/usage reporting including assets in use, storage, network traffic, and qualitative improvement recommendations.',
            evidenceItems: [
              { id: '2.11.2-E1', text: 'Examples of Asset Usage Reports with tools, sources, metrics, and asset use improvement recommendations', isRenewal: true, status: 'not-checked' },
            ],
          },
          {
            id: '2.11.3',
            title: 'Cost Reporting',
            description: 'Cost reporting showing total GC usage cost, individual service costs, resource costs, potential savings, and cost-efficiency recommendations.',
            evidenceItems: [
              { id: '2.11.3-E1', text: 'Examples of Cost Reports (can be anonymized) with tools, sources, metrics, and cost-effectiveness improvement recommendations', isRenewal: true, status: 'not-checked' },
            ],
          },
        ],
      },
    ],
  },
];

export function flattenSections(sections: ProgramSection[]): ProgramSection[] {
  const result: ProgramSection[] = [];
  for (const section of sections) {
    result.push(section);
    if (section.children) {
      result.push(...flattenSections(section.children));
    }
  }
  return result;
}

export function getSectionById(id: string): ProgramSection | undefined {
  const flat = flattenSections(PROGRAM_SECTIONS);
  return flat.find((s) => s.id === id);
}

export function getSectionOptions(): { id: string; label: string }[] {
  const flat = flattenSections(PROGRAM_SECTIONS);
  return flat.map((s) => ({
    id: s.id,
    label: `${s.id} — ${s.title}`,
  }));
}

export function getSectionContext(sectionId: string): string {
  const section = getSectionById(sectionId);
  if (!section) return '';

  let context = `## Section ${section.id}: ${section.title}\n\n`;
  context += `${section.description}\n\n`;

  if (section.evidenceItems.length > 0) {
    context += `### Required Evidence:\n`;
    section.evidenceItems.forEach((item, i) => {
      context += `${i + 1}. [${item.id}] ${item.text}${item.isRenewal ? ' [Required for Renewal]' : ''}\n`;
    });
  }

  if (section.children) {
    for (const child of section.children) {
      context += `\n${getSectionContext(child.id)}`;
    }
  }

  return context;
}
