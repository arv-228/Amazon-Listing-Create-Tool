export type AppLanguage = 'en' | 'fr' | 'de' | 'zh-CN' | 'zh-TW';
export type AppTheme = 'light' | 'dark';
export type AISource = 'gemini' | 'chatgpt' | 'deepseek' | 'qwen' | 'claude' | 'kiwi';

export interface ProductAnalysis {
  color: string;
  style: string;
  lifestyle: string;
  relations: {
    usedForFunction: string[];
    usedForEvent: string[];
    usedForAudience: string[];
    capableOf: string[];
    usedTo: string[];
    usedAs: string[];
    isA: string[];
    usedOn: string[];
    usedInLocation: string[];
    usedInBody: string[];
    usedWith: string[];
    usedBy: string[];
    interestedIn: string[];
    isAAudience: string[];
    want: string[];
  };
}

export interface ListingSet {
  title: string;
  bullets: string[];
  description: string;
  style: string;
  lifestyle: string;
  keywords: {
    seed: string[];
    shortTail: string[]; // 核心修复：新增短尾词
    longTail: string[];
    audience: string[];
    niche: string[];
    searchTerms: string[]; // 核心修复：新增Search Terms
  };
}

export interface APlusPage {
  pageNumber: number;
  scenario: string;
  activity: string;
  visualPrompt: string;
  copyContent: string;
}

export interface FullWorkflowData {
  analysis: ProductAnalysis;
  listingSets: ListingSet[];
  aPlusPages: APlusPage[];
}

export enum WorkflowStep {
  INPUT = 0,
  ANALYSIS = 1,
  GENERATION = 2,
  OUTPUT = 3
}