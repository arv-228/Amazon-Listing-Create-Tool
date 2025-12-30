import React, { useState, useEffect } from 'react';
import { WorkflowStep, ProductAnalysis, FullWorkflowData, AppLanguage, AppTheme, AISource } from './types';
import { analyzeProduct, generateMarketingContent } from './services/geminiService';
import Step1Input from './components/Step1Input';
import Step2Analysis from './components/Step2Analysis';
import Step3Advanced from './components/Step3Advanced';
import LicenseModal from './components/LicenseModal'; // [新增] 引入授权组件
import { 
  Sparkles, Package, Layout, ChevronRight, RotateCcw, 
  ShieldAlert, Key, Search, Gem, ShoppingCart, 
  Settings, X, Moon, Sun, Languages, Cpu, BrainCircuit, Zap
} from 'lucide-react';

const TRANSLATIONS = {
  en: {
    appName: "AMZ Listing Gem", setup: "Setup", analysis: "Analysis", listings: "Listings", aplus: "A+ Content",
    settings: "Settings", language: "Language", theme: "Theme", aiSource: "AI Source", apiKey: "API Key", apiKeyPlaceholder: "Enter API Key...",
    activating: "Activating Analysis...", polishing: "Polishing Content...", errorTitle: "Gem Error", dismiss: "Dismiss"
  },
  fr: {
    appName: "Joyau d'Inscription AMZ", setup: "Configuration", analysis: "Analyse", listings: "Annonces", aplus: "Contenu A+",
    settings: "Paramètres", language: "Langue", theme: "Thème", aiSource: "Source d'IA", apiKey: "Clé API", apiKeyPlaceholder: "Entrez la clé API...",
    activating: "Analyse en cours...", polishing: "Polissage du contenu...", errorTitle: "Erreur de Joyau", dismiss: "Ignorer"
  },
  de: {
    appName: "AMZ Listing Juwel", setup: "Einrichtung", analysis: "Analyse", listings: "Angebote", aplus: "A+ Inhalte",
    settings: "Einstellungen", language: "Sprache", theme: "Design", aiSource: "KI-Quelle", apiKey: "API-Schlüssel", apiKeyPlaceholder: "Schlüssel eingeben...",
    activating: "Analyse läuft...", polishing: "Inhalte polieren...", errorTitle: "Juwel-Fehler", dismiss: "Verwerfen"
  },
  'zh-CN': {
    appName: "AMZ 上架宝库", setup: "启动分析", analysis: "15点分析", listings: "列表内容", aplus: "A+ 页面",
    settings: "设置", language: "语言", theme: "主题", aiSource: "AI 模型来源", apiKey: "API 密钥", apiKeyPlaceholder: "请输入 API 密钥...",
    activating: "正在激活分析...", polishing: "正在生成 PPC 矩阵与 A+...", errorTitle: "宝库错误", dismiss: "忽略"
  },
  'zh-TW': {
    appName: "AMZ 上架寶庫", setup: "啟動分析", analysis: "15點分析", listings: "列表內容", aplus: "A+ 頁面",
    settings: "設定", language: "語言", theme: "主題", aiSource: "AI 模型來源", apiKey: "API 金鑰", apiKeyPlaceholder: "請輸入 API 金鑰...",
    activating: "正在激活分析...", polishing: "正在生成 PPC 矩陣與 A+...", errorTitle: "寶庫錯誤", dismiss: "忽略"
  }
};

const StatusOverlay = () => {
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [speed, setSpeed] = useState("Checking...");
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    const speedTimer = setInterval(() => {
      const start = Date.now();
      fetch('https://www.google.com/favicon.ico', { mode: 'no-cors', cache: 'no-cache' })
        .then(() => setSpeed(`${Date.now() - start}ms`))
        .catch(() => setSpeed("Blocked"));
    }, 5000);
    return () => { clearInterval(timer); clearInterval(speedTimer); };
  }, []);
  return (
    <div className="fixed bottom-4 right-6 flex items-center gap-4 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-full text-[10px] font-mono text-slate-400 z-[100]">
      <div className="flex items-center gap-2">
        <div className={`w-1.5 h-1.5 rounded-full ${speed.includes('ms') ? 'bg-green-500' : 'bg-rose-500'}`}></div>
        LATENCY: {speed}
      </div>
      <div className="w-px h-3 bg-slate-700"></div>
      <div>{time}</div>
    </div>
  );
};

const App: React.FC = () => {
  // [新增] 授权状态，默认为 false，除非 LicenseModal 验证通过
  const [isLicensed, setIsLicensed] = useState(false);

  const [step, setStep] = useState<WorkflowStep>(WorkflowStep.INPUT);
  const [activeTab, setActiveTab] = useState<'listings' | 'aplus'>('listings');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [language, setLanguage] = useState<AppLanguage>('zh-CN');
  const [theme, setTheme] = useState<AppTheme>('light');
  const [aiSource, setAiSource] = useState<AISource>('deepseek');
  const [personalApiKey, setPersonalApiKey] = useState('');
  const [inputImage, setInputImage] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [analysis, setAnalysis] = useState<ProductAnalysis | null>(null);
  const [marketingData, setMarketingData] = useState<FullWorkflowData | null>(null);

  const t = TRANSLATIONS[language];

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  const getOutputLanguage = (lang: AppLanguage) => {
    switch(lang) {
      case 'fr': return 'French';
      case 'de': return 'German';
      case 'zh-CN': case 'zh-TW': return 'English'; 
      default: return 'English';
    }
  };

  const handleStartAnalysis = async (image: string | null, text: string) => {
    if (!personalApiKey) { setError(t.apiKeyPlaceholder); setShowSettings(true); return; }
    
    // 开启新任务时，只在此处清理旧的生成数据
    setLoading(true); 
    setError(null); 
    setInputImage(image); 
    setInputText(text);
    setMarketingData(null); // 清理旧的 Listings/A+

    try {
      const result = await analyzeProduct(image, text, { provider: aiSource, apiKey: personalApiKey });
      if (!result || !result.relations) throw new Error("Analysis failed: Invalid data structure.");
      
      setAnalysis(result); 
      setStep(WorkflowStep.ANALYSIS);
    } catch (err: any) { 
      setError(err.message); 
      setStep(WorkflowStep.INPUT); 
    } finally { setLoading(false); }
  };

  const handleGenerateFullContent = async () => {
    if (!analysis) return;
    setLoading(true); setError(null);
    try {
      const targetLang = getOutputLanguage(language);
      const result = await generateMarketingContent(analysis, { provider: aiSource, apiKey: personalApiKey }, targetLang);
      
      if (!result || !Array.isArray(result.listingSets) || !Array.isArray(result.aPlusPages)) {
        throw new Error("Broken AI response: Generation incomplete.");
      }
      
      setMarketingData({ analysis, ...result }); 
      setStep(WorkflowStep.GENERATION);
      setActiveTab('listings'); 
    } catch (err: any) { 
      setError(`Generation Error: ${err.message}`);
      setStep(WorkflowStep.ANALYSIS);
    } finally { setLoading(false); }
  };

  // 这是一个完全重置的函数
  const resetWorkflow = () => {
    setStep(WorkflowStep.INPUT);
    setAnalysis(null);
    setMarketingData(null);
    setError(null);
  };

  // 导航逻辑优化 - 点击 "Input" 不再清空数据
  const handleNavClick = (targetStep: string, tab?: 'listings' | 'aplus') => {
    if (targetStep === 'input') {
        setStep(WorkflowStep.INPUT);
    }
    if (targetStep === 'analysis' && analysis) {
        setStep(WorkflowStep.ANALYSIS);
    }
    if (targetStep === 'generation' && marketingData) {
      setStep(WorkflowStep.GENERATION);
      if (tab) setActiveTab(tab);
    }
  };

  // [新增] 核心验证逻辑：如果未授权，强制显示激活弹窗，并不渲染主界面
  if (!isLicensed) {
    return <LicenseModal onActivated={() => setIsLicensed(true)} />;
  }

  // 授权通过后，渲染主界面
  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 ${theme === 'dark' ? 'bg-[#0f172a] text-slate-100' : 'bg-[#fcfdff] text-gray-900'}`}>
      {showSettings && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`${theme === 'dark' ? 'bg-[#1e293b] border-slate-700' : 'bg-white border-indigo-100'} rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl border relative max-h-[90vh] overflow-y-auto`}>
            <button onClick={() => setShowSettings(false)} className="absolute top-6 right-6 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"><X size={20} className="text-slate-400" /></button>
            <h2 className="text-2xl font-black mb-8 flex items-center gap-3"><Settings className="text-indigo-600" /> {t.settings}</h2>

            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Cpu size={14} />{t.aiSource}</label>
                <div className="grid grid-cols-2 gap-2">
                  {['gemini', 'chatgpt', 'claude', 'grok', 'deepseek', 'qwen', 'kiwi'].map(id => (
                    <button key={id} onClick={() => setAiSource(id as AISource)} className={`px-4 py-3 rounded-xl border text-xs font-bold transition-all ${aiSource === id ? 'border-indigo-600 bg-indigo-50 text-indigo-600' : 'border-slate-100 text-slate-400'}`}>{id.toUpperCase()}</button>
                  ))}
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Key size={14} />{t.apiKey}</label>
                <input 
                  type="password" 
                  value={personalApiKey} 
                  onChange={e => setPersonalApiKey(e.target.value)} 
                  className="w-full px-5 py-4 rounded-2xl border border-slate-200 bg-white text-slate-600 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all" 
                  placeholder={t.apiKeyPlaceholder} 
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Languages size={14} />{t.language}</label>
                <select 
                  value={language} 
                  onChange={e => setLanguage(e.target.value as AppLanguage)} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold outline-none cursor-pointer"
                >
                  <option value="en">English (EN)</option>
                  <option value="zh-CN">简体中文 (CN)</option>
                  <option value="zh-TW">繁體中文 (TW)</option>
                  <option value="fr">Français (FR)</option>
                  <option value="de">Deutsch (DE)</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Sun size={14} />{t.theme}</label>
                <select 
                  value={theme} 
                  onChange={e => setTheme(e.target.value as AppTheme)} 
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-bold outline-none cursor-pointer"
                >
                  <option value="light">Light Mode</option>
                  <option value="dark">Dark Mode</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 顶部导航栏 */}
      <header className="border-b px-8 py-3 flex items-center justify-between">
        {/* Logo 点击也只切换视图，不清空数据 */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStep(WorkflowStep.INPUT)}>
            <Gem className="text-indigo-600 w-8 h-8" />
            <h1 className="text-xl font-black">{t.appName}</h1>
        </div>
        
        <nav className="hidden lg:flex items-center gap-4 font-bold text-xs">
          <button onClick={() => handleNavClick('input')} className={step === WorkflowStep.INPUT ? 'text-indigo-600' : 'text-slate-400'}>{t.setup}</button>
          <ChevronRight size={14} className="text-slate-200" />
          
          <button disabled={!analysis} onClick={() => handleNavClick('analysis')} className={step === WorkflowStep.ANALYSIS ? 'text-indigo-600' : 'text-slate-400'}>{t.analysis}</button>
          <ChevronRight size={14} className="text-slate-200" />
          
          <button disabled={!marketingData} onClick={() => handleNavClick('generation', 'listings')} className={step === WorkflowStep.GENERATION && activeTab === 'listings' ? 'text-indigo-600' : 'text-slate-400'}>{t.listings}</button>
          <ChevronRight size={14} className="text-slate-200" />
          
          <button disabled={!marketingData} onClick={() => handleNavClick('generation', 'aplus')} className={step === WorkflowStep.GENERATION && activeTab === 'aplus' ? 'text-indigo-600' : 'text-slate-400'}>{t.aplus}</button>
        </nav>
        <button onClick={() => setShowSettings(true)} className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors active:scale-95"><Settings size={20} /></button>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-8">
        {error && (
          <div className="mb-6 bg-rose-50 border border-rose-100 text-rose-700 px-5 py-4 rounded-2xl flex items-start gap-4 shadow-sm animate-in slide-in-from-top-2">
            <ShieldAlert size={20} className="mt-0.5 text-rose-500" />
            <div className="flex-1 text-sm font-bold">{t.errorTitle}: {error}</div>
            <button onClick={() => setError(null)} className="text-xs font-black uppercase hover:text-rose-900">{t.dismiss}</button>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-8">
            <div className="w-20 h-20 border-[3px] border-indigo-50 border-t-indigo-600 rounded-full animate-spin"></div>
            <h3 className="text-xl font-bold">{step === WorkflowStep.INPUT ? t.activating : t.polishing}</h3>
          </div>
        ) : (
          <div className="transition-all duration-300">
            {step === WorkflowStep.INPUT && <Step1Input onStart={handleStartAnalysis} language={language} theme={theme} />}
            {step === WorkflowStep.ANALYSIS && analysis && <Step2Analysis analysis={analysis} image={inputImage} onNext={handleGenerateFullContent} language={language} theme={theme} />}
            {step === WorkflowStep.GENERATION && marketingData && <Step3Advanced data={marketingData} activeTab={activeTab} setActiveTab={setActiveTab} originalImage={inputImage} onKeyError={() => false} requestKey={() => setShowSettings(true)} language={language} theme={theme} personalApiKey={personalApiKey} />}
          </div>
        )}
      </main>
      <StatusOverlay />
    </div>
  );
};

export default App;