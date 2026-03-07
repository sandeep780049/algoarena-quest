import {
  Database,
  Cpu,
  Globe,
  Server,
  Binary,
  GitBranch,
  Calculator,
  CircuitBoard,
  HardDrive,
  Sigma,
  type LucideIcon,
} from 'lucide-react';

export interface GateSubject {
  id: string;
  name: string;
  shortName: string;
  icon: LucideIcon;
  color: string;
  description: string;
}

export const GATE_SUBJECTS: GateSubject[] = [
  { id: 'data-structures', name: 'Data Structures', shortName: 'DS', icon: Database, color: 'hsl(168 84% 45%)', description: 'Arrays, Linked Lists, Trees, Graphs, Hashing' },
  { id: 'algorithms', name: 'Algorithms', shortName: 'Algo', icon: GitBranch, color: 'hsl(262 83% 58%)', description: 'Sorting, Searching, DP, Greedy, Divide & Conquer' },
  { id: 'operating-systems', name: 'Operating Systems', shortName: 'OS', icon: Server, color: 'hsl(38 92% 50%)', description: 'Process, Memory, File Systems, Scheduling' },
  { id: 'computer-networks', name: 'Computer Networks', shortName: 'CN', icon: Globe, color: 'hsl(200 80% 50%)', description: 'OSI, TCP/IP, Routing, Subnetting' },
  { id: 'dbms', name: 'Database Management Systems', shortName: 'DBMS', icon: Database, color: 'hsl(340 75% 55%)', description: 'SQL, Normalization, Transactions, ER Model' },
  { id: 'theory-of-computation', name: 'Theory of Computation', shortName: 'TOC', icon: Binary, color: 'hsl(142 76% 36%)', description: 'Automata, CFG, Turing Machines, Decidability' },
  { id: 'compiler-design', name: 'Compiler Design', shortName: 'CD', icon: Cpu, color: 'hsl(280 70% 55%)', description: 'Lexical Analysis, Parsing, Code Generation' },
  { id: 'discrete-mathematics', name: 'Discrete Mathematics', shortName: 'DM', icon: Sigma, color: 'hsl(20 80% 55%)', description: 'Sets, Relations, Graph Theory, Combinatorics' },
  { id: 'digital-logic', name: 'Digital Logic', shortName: 'DL', icon: CircuitBoard, color: 'hsl(180 70% 45%)', description: 'Boolean Algebra, K-Maps, Flip-Flops, Counters' },
  { id: 'computer-organization', name: 'Computer Organization & Architecture', shortName: 'COA', icon: HardDrive, color: 'hsl(50 80% 45%)', description: 'CPU, Pipelining, Cache, I/O Organization' },
  { id: 'engineering-mathematics', name: 'Engineering Mathematics', shortName: 'EM', icon: Calculator, color: 'hsl(310 70% 50%)', description: 'Linear Algebra, Calculus, Probability, Statistics' },
];

export function getSubjectById(id: string): GateSubject | undefined {
  return GATE_SUBJECTS.find(s => s.id === id);
}
