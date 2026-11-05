import type { Project } from './types'

/** Featured cards first, in the source order. `ai1` (n8n) has no `live`: its link was an n8n login page (Q5). */
export const aiTools: Project[] = [
  {
    id: 'ai6',
    image: 'fullstack-agent.svg',
    title: 'Full Stack AI Agent – Multi-Agent Software Team',
    badge: 'Live',
    featured: true,
    desc: 'An autonomous multi-agent software engineering team of seven specialised Claude Code agents operating with a unified workflow, shared coding standards, and automatic quality gates. Features a real-time Agent Studio live collaboration animation.',
    highlights: [
      'Seven specialised roles: Lead, Planner, ASP.NET Core Backend, React/TS Frontend, QA, Docs, and DevOps',
      'Real-time Agent Studio browser UI animating live agent collaboration, dispatching, and pipelines',
      'Contract-driven development: ASP.NET Core OpenAPI specs automatically generate TypeScript client types',
      'Strict quality gates with pre-commit builds, automated /code-review, /security-review, and zero unconfirmed pushes',
    ],
    tags: ['Claude Code', 'Multi-Agent', 'Agent Studio', 'ASP.NET Core', 'React', 'TypeScript', 'DevOps'],
    live: 'https://full-stack-ai-agent-vybc.onrender.com/portfolio',
    code: 'https://github.com/immanuelMM/Full-Stack-AI-Agent',
  },
  {
    id: 'ai4',
    image: 'master-brd.svg',
    title: 'Master BRD – Requirements Audit Agent Team',
    badge: 'Live',
    featured: true,
    desc: 'A multi-agent AI system that verifies whether every requirement in a Business Requirements Document is actually implemented in the codebase — so teams sign off on evidence, not assumptions.',
    highlights: [
      'Audits BRDs against source code and keeps only proven requirements',
      'Interactive 3D knowledge graph to explore requirements and coverage',
      'Self-service request portal that runs AI analysis and emails results to stakeholders',
      'Guardrails and reusable skills built on Claude Code hooks (/brd-audit, /brd-analyze)',
    ],
    tags: ['Claude Code', 'Multi-Agent', 'Node.js', 'JavaScript', 'EmailJS'],
    live: 'https://master-brd.onrender.com/flow.html',
    code: 'https://github.com/immanuelMM/Master_BRD',
  },
  {
    id: 'ai5',
    image: 'ba-reviewer.svg',
    title: 'Business Analyzt Reviewer – BRD Agent Team',
    badge: 'Live',
    featured: true,
    desc: 'An AI agent team that turns raw Confluence requirement pages into a client-ready Business Requirements Document — reducing the back-and-forth between analysts and requirement owners.',
    highlights: [
      'Four specialised agents: Summarizer, Consolidator, Prototype Answerer and BRD Formatter',
      'Generates prioritised clarification questions and answers them against a clickable prototype',
      'Human-in-the-loop verification with Atlassian Rovo before questions reach owners',
      'Exports a polished, ready-to-share BRD in PDF and Word',
    ],
    tags: ['Claude Code', 'Multi-Agent', 'Confluence', 'Jira', 'Rovo'],
    live: 'https://business-analyzt-reviewer.onrender.com/docs/index.html',
    code: 'https://github.com/immanuelMM/Business-Analyzt-Reviewer',
  },
  {
    id: 'ai1',
    image: 'n8n-workflow.svg',
    title: 'n8n Workflow Automation',
    badge: 'Live',
    desc: 'Automated workflows that orchestrate multi-step processes, API integrations and data pipelines — replacing repetitive manual work with reliable, AI-assisted automation.',
    tags: ['n8n', 'Workflow Automation', 'REST API', 'JSON', 'Webhooks'],
  },
  {
    id: 'ai2',
    image: 'agentic-coding.svg',
    title: 'Agentic Coding',
    badge: 'Daily Use',
    desc: 'Uses AI coding agents (Claude Code, Google Antigravity) to plan, scaffold, debug and ship full-stack features faster — with human review on every change.',
    tags: ['Claude Code', 'Antigravity AI', 'Agentic Coding', 'AI Pair Programming'],
  },
  {
    id: 'ai3',
    image: 'prompt-engineering.svg',
    title: 'Prompt Engineering & LLM Integration',
    badge: 'Skill',
    desc: 'Designs structured prompts and integrates LLM APIs into web applications to add summarisation, analysis and intelligent automation to real products.',
    tags: ['Prompt Engineering', 'LLM', 'AI APIs', 'Claude', 'OpenAI'],
  },
]

/** `ws_agent` of the source is shown once, as the first AI card (`ai6`). */
export const webSystems: Project[] = [
  {
    id: 'ws1',
    title: 'LoanPro – Loan Management System',
    desc: 'A full-featured loan management web app with borrower tracking, loan lifecycle management, amortization schedules, payment recording, PDF receipts, and a KPI dashboard.',
    tags: ['JavaScript', 'Node.js', 'MySQL', 'HTML', 'CSS', 'PDF'],
    live: 'https://loanpro-ui.onrender.com/#dashboard',
  },
  {
    id: 'ws2',
    title: 'MCGI Hub',
    desc: 'Contributed to the MCGI Hub – a large-scale internal web application for MCGI. Built dynamic, reusable Vue.js components with a focus on performance, security, and scalability.',
    tags: ['Vue.js', 'TypeScript', 'JavaScript', 'CSS'],
    live: 'https://hub.mcgi.org/calendar',
  },
  {
    id: 'ws3',
    title: 'Axe Uniforms – E-Commerce System',
    desc: 'Professional uniform and apparel e-commerce system with responsive product listings, shopping cart, and checkout flow for a Philippine-based uniform supplier.',
    tags: ['HTML', 'CSS', 'JavaScript', 'E-Commerce'],
    live: 'https://axeuniforms.com/',
  },
  {
    id: 'ws4',
    title: 'PG Uniforms – Corporate System',
    desc: 'Corporate web system for PG Uniforms, a Philippine uniform manufacturer. Clean, responsive design showcasing product catalog and company information.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Responsive'],
    live: 'https://www.pguniforms.com/',
  },
]

export const staticProjects: Project[] = [
  {
    id: 'sp1',
    title: 'Survivor Game – Interactive Web App',
    desc: 'An interactive browser-based Survivor-themed game with dynamic game logic, player management, voting mechanics, and engaging UI built entirely with vanilla JavaScript.',
    tags: ['JavaScript', 'HTML', 'CSS', 'Game Logic'],
    live: 'https://immanuelmm.github.io/Survivor_2/',
  },
  {
    id: 'sp2',
    title: 'OneKnowledge CLLC – Company Profile',
    desc: 'Company profile website for OneKnowledge CLLC with smooth navigation, responsive layout, and professional multi-page design.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Bootstrap'],
    live: 'https://immanuelmm.github.io/OneKnowledgeCLLC/',
  },
  {
    id: 'sp3',
    title: 'KR – Landing Page',
    desc: 'A sleek landing page with modern UI design, smooth scroll effects, and a fully responsive layout optimized for all screen sizes.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Responsive'],
    live: 'https://immanuelmm.github.io/KR/',
  },
  {
    id: 'sp4',
    title: 'Kirstin Regalado – Artist Portfolio',
    desc: 'A personal portfolio fan site for artist Kirstin Regalado with a music-themed aesthetic, photo gallery, and smooth animations.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Bootstrap'],
    live: 'https://immanuelmm.github.io/kirstin-regalado/',
  },
  {
    id: 'sp5',
    title: 'Personal Portfolio v1 (Student)',
    desc: 'My original portfolio website built as a student – a milestone project showcasing early web dev skills with HTML, CSS, and JavaScript.',
    tags: ['HTML', 'CSS', 'JavaScript', 'Bootstrap'],
    live: 'https://immanuelmm.github.io/My-portfolio/',
  },
]
