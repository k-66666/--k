import React, { useState, useEffect } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Zap, 
  LayoutDashboard, 
  History, 
  Settings, 
  Bot, 
  Power,
  AlertTriangle,
  Lightbulb,
  Cpu,
  CircuitBoard,
  ShoppingCart,
  Code,
  CheckCircle2,
  Plug,
  Cable,
  Download,
  Share,
  X
} from 'lucide-react';
import { SensorData, DeviceState, Thresholds, AppTab } from './types';
import { EnvironmentCard } from './components/EnvironmentCard';
import { HistoryChart } from './components/HistoryChart';
import { analyzeWardrobeEnvironment } from './services/geminiService';

// --- Simulation Helpers ---
const generateInitialData = (): SensorData[] => {
  const data: SensorData[] = [];
  const now = Date.now();
  for (let i = 20; i > 0; i--) {
    data.push({
      timestamp: now - i * 3000,
      temperature: 24 + Math.random() * 2,
      humidity: 50 + Math.random() * 10,
      moldIndex: 5 + Math.random() * 5
    });
  }
  return data;
};

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.DASHBOARD);
  
  // Simulated Hardware State
  const [sensors, setSensors] = useState<SensorData>({
    timestamp: Date.now(),
    temperature: 24.5,
    humidity: 55,
    moldIndex: 10
  });
  
  const [history, setHistory] = useState<SensorData[]>(generateInitialData());
  
  const [devices, setDevices] = useState<DeviceState>({
    fan: false,
    dehumidifier: false,
    uvLight: false,
    autoMode: true
  });

  const [thresholds, setThresholds] = useState<Thresholds>({
    maxHumidity: 65,
    triggerUVPeriod: 24
  });

  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // Check for iOS
  useEffect(() => {
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIosDevice);
  }, []);

  // Listen for install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstallBanner(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowInstallBanner(false);
      }
      setDeferredPrompt(null);
    }
  };

  // --- Hardware Simulation Logic (The "Firmware") ---
  useEffect(() => {
    const interval = setInterval(() => {
      setSensors(prev => {
        let newTemp = prev.temperature;
        let newHum = prev.humidity;
        let newMold = prev.moldIndex;

        // Natural Environmental drift
        newTemp += (Math.random() - 0.5) * 0.1;
        newHum += (Math.random() - 0.5) * 0.5;

        // Device Effects
        if (devices.fan) {
          newHum -= 0.4; // Fan dries air slowly
          newTemp -= 0.05;
        }
        if (devices.dehumidifier) {
          newHum -= 1.2; // Strong drying
          newTemp += 0.1; // Slight heat
        }
        if (devices.uvLight) {
          newMold -= 2.0; // Kills mold
          newTemp += 0.05;
        } else {
          // Mold grows if humid
          if (newHum > 70) newMold += 0.5;
          if (newHum > 80) newMold += 1.0;
        }

        // Constraints
        newHum = Math.max(30, Math.min(99, newHum));
        newMold = Math.max(0, Math.min(100, newMold));

        const newData = {
          timestamp: Date.now(),
          temperature: newTemp,
          humidity: newHum,
          moldIndex: newMold
        };

        setHistory(h => [...h.slice(-50), newData]); // Keep last 50 points
        return newData;
      });
    }, 2000); // 2 second tick

    return () => clearInterval(interval);
  }, [devices]);

  // --- Automation Logic ---
  useEffect(() => {
    if (!devices.autoMode) return;

    setDevices(prev => {
      let next = { ...prev };
      let changed = false;

      // Humidity Control Logic
      if (sensors.humidity > thresholds.maxHumidity) {
        if (!prev.fan && !prev.dehumidifier) {
          next.fan = true;
          next.dehumidifier = true;
          changed = true;
        }
      } else if (sensors.humidity < thresholds.maxHumidity - 5) {
        // Hysteresis: turn off when 5% below threshold
        if (prev.fan || prev.dehumidifier) {
          next.fan = false;
          next.dehumidifier = false;
          changed = true;
        }
      }

      // Mold Safety Logic
      if (sensors.moldIndex > 40 && !prev.uvLight) {
        next.uvLight = true;
        changed = true;
      } else if (sensors.moldIndex < 5 && prev.uvLight) {
         next.uvLight = false;
         changed = true;
      }

      return changed ? next : prev;
    });
  }, [sensors, thresholds.maxHumidity, devices.autoMode]);


  // --- Handlers ---
  const toggleDevice = (device: keyof DeviceState) => {
    if (device !== 'autoMode' && devices.autoMode) {
      alert("请先关闭自动模式 (Auto Mode) 才能手动控制设备。");
      return;
    }
    setDevices(prev => ({ ...prev, [device]: !prev[device] }));
  };

  const handleGeminiAnalysis = async () => {
    setIsAnalyzing(true);
    const result = await analyzeWardrobeEnvironment(sensors, history, thresholds);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  // --- View Components ---
  
  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Sensor Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <EnvironmentCard 
          title="当前温度" 
          value={sensors.temperature.toFixed(1)} 
          unit="°C" 
          icon={Thermometer} 
          colorClass="bg-orange-500" 
        />
        <EnvironmentCard 
          title="当前湿度" 
          value={sensors.humidity.toFixed(1)} 
          unit="%" 
          icon={Droplets} 
          colorClass="bg-blue-500"
          status={sensors.humidity > thresholds.maxHumidity ? 'warning' : 'normal'}
        />
        <EnvironmentCard 
          title="霉菌风险指数" 
          value={sensors.moldIndex.toFixed(0)} 
          unit="/ 100" 
          icon={AlertTriangle} 
          colorClass="bg-purple-500"
          status={sensors.moldIndex > 50 ? 'critical' : 'normal'}
        />
      </div>

      {/* Main Control Panel */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">设备控制面板</h2>
          <div className="flex items-center space-x-2">
             <span className={`text-sm font-medium ${devices.autoMode ? 'text-green-600' : 'text-slate-400'}`}>
                {devices.autoMode ? '自动托管中' : '手动模式'}
             </span>
             <button 
                onClick={() => toggleDevice('autoMode')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${devices.autoMode ? 'bg-green-500' : 'bg-slate-300'}`}
             >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${devices.autoMode ? 'translate-x-6' : 'translate-x-1'}`} />
             </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => toggleDevice('fan')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              devices.fan ? 'border-blue-500 bg-blue-50' : 'border-slate-100 bg-slate-50 opacity-70'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${devices.fan ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <Wind className={`w-6 h-6 ${devices.fan ? 'animate-spin' : ''}`} />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800">排风扇</p>
                <p className="text-xs text-slate-500">{devices.fan ? '运行中' : '已关闭'}</p>
              </div>
            </div>
            <Power className={`w-5 h-5 ${devices.fan ? 'text-blue-500' : 'text-slate-300'}`} />
          </button>

          <button 
            onClick={() => toggleDevice('dehumidifier')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              devices.dehumidifier ? 'border-cyan-500 bg-cyan-50' : 'border-slate-100 bg-slate-50 opacity-70'
            }`}
          >
             <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${devices.dehumidifier ? 'bg-cyan-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <Droplets className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800">除湿机</p>
                <p className="text-xs text-slate-500">{devices.dehumidifier ? '除湿中' : '已关闭'}</p>
              </div>
            </div>
            <Power className={`w-5 h-5 ${devices.dehumidifier ? 'text-cyan-500' : 'text-slate-300'}`} />
          </button>

          <button 
            onClick={() => toggleDevice('uvLight')}
            className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
              devices.uvLight ? 'border-purple-500 bg-purple-50' : 'border-slate-100 bg-slate-50 opacity-70'
            }`}
          >
             <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-lg ${devices.uvLight ? 'bg-purple-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                <Zap className="w-6 h-6" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-slate-800">UV杀菌灯</p>
                <p className="text-xs text-slate-500">{devices.uvLight ? '杀菌中' : '已关闭'}</p>
              </div>
            </div>
            <Power className={`w-5 h-5 ${devices.uvLight ? 'text-purple-500' : 'text-slate-300'}`} />
          </button>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-6 animate-in fade-in">
       <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex justify-between items-end mb-4">
             <div>
                <h2 className="text-lg font-bold text-slate-800">数据日志</h2>
                <p className="text-slate-500 text-sm">衣柜环境数据的实时记录与趋势。</p>
             </div>
             <button 
              onClick={() => setHistory(generateInitialData())} // Reset sim
              className="text-xs text-blue-600 hover:underline"
             >
               重置模拟数据
             </button>
          </div>
          <HistoryChart data={history} />
       </div>

       <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200">
         <table className="w-full text-sm text-left text-slate-500">
            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
               <tr>
                  <th className="px-6 py-3">时间</th>
                  <th className="px-6 py-3">温度</th>
                  <th className="px-6 py-3">湿度</th>
                  <th className="px-6 py-3">霉菌指数</th>
               </tr>
            </thead>
            <tbody>
              {history.slice(-10).reverse().map((log, idx) => (
                 <tr key={idx} className="bg-white border-b hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td className="px-6 py-4">{log.temperature.toFixed(2)} °C</td>
                    <td className="px-6 py-4">
                       <span className={`${log.humidity > thresholds.maxHumidity ? 'text-red-600 font-bold' : ''}`}>
                          {log.humidity.toFixed(1)} %
                       </span>
                    </td>
                    <td className="px-6 py-4">{log.moldIndex.toFixed(1)}</td>
                 </tr>
              ))}
            </tbody>
         </table>
       </div>
    </div>
  );

  const renderSettings = () => (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 max-w-2xl mx-auto animate-in fade-in">
      <h2 className="text-xl font-bold text-slate-800 mb-6">系统设置</h2>
      
      {/* APP Install Section */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-8">
        <h3 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
          <Download className="w-5 h-5"/> 安装 APP 到手机
        </h3>
        <p className="text-sm text-blue-600 mb-4">
          将此控制台作为 APP 安装到您的手机桌面，即可全屏运行并获得更流畅的体验。
        </p>
        <div className="flex gap-3">
          {deferredPrompt ? (
            <button 
              onClick={handleInstallClick}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-700 transition"
            >
              点击安装
            </button>
          ) : (
            <button 
              disabled
              className="bg-blue-200 text-blue-400 px-4 py-2 rounded-lg text-sm font-semibold cursor-not-allowed"
            >
              {isIOS ? '请按下方说明操作' : '已安装或不支持'}
            </button>
          )}
        </div>
        
        {/* iOS Instructions */}
        {isIOS && (
          <div className="mt-4 pt-4 border-t border-blue-200 text-sm text-blue-700">
             <p className="font-bold mb-1">iOS 用户安装方法：</p>
             <ol className="list-decimal list-inside space-y-1">
               <li>点击 Safari 浏览器底部的 <Share className="w-4 h-4 inline" /> 分享按钮</li>
               <li>向下滑动并选择“添加到主屏幕”</li>
             </ol>
          </div>
        )}
      </div>

      <h2 className="text-lg font-bold text-slate-800 mb-4">自动化阈值</h2>
      <div className="space-y-8">
        <div>
          <div className="flex justify-between mb-2">
            <label className="text-sm font-medium text-slate-700">最大湿度触发值 (Max Humidity)</label>
            <span className="text-sm font-bold text-blue-600">{thresholds.maxHumidity}%</span>
          </div>
          <input 
            type="range" 
            min="30" 
            max="90" 
            value={thresholds.maxHumidity}
            onChange={(e) => setThresholds(prev => ({ ...prev, maxHumidity: parseInt(e.target.value) }))}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
          />
          <p className="text-xs text-slate-500 mt-2">
            当湿度超过此数值时，系统将自动启动风扇和除湿机（需开启自动模式）。建议设置在 60% 左右。
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100">
           <h3 className="font-medium text-slate-800 mb-2">设备信息</h3>
           <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-50 p-3 rounded-lg">
                 <span className="block text-slate-400 text-xs uppercase">固件版本</span>
                 <span className="font-mono text-slate-700">v2.4.1-IoT (CN)</span>
              </div>
              <div className="bg-slate-50 p-3 rounded-lg">
                 <span className="block text-slate-400 text-xs uppercase">网络状态</span>
                 <span className="font-mono text-green-600">Wi-Fi (信号强)</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  const renderAI = () => (
    <div className="animate-in fade-in max-w-2xl mx-auto">
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-6 text-white shadow-lg mb-6">
        <div className="flex items-center space-x-3 mb-4">
           <Bot className="w-8 h-8" />
           <h2 className="text-xl font-bold">AI 卫生顾问</h2>
        </div>
        <p className="text-indigo-100 mb-6">
          利用 Google Gemini 大模型技术，分析您衣柜的微气候数据，并给出专业的防霉建议。
        </p>
        <button 
          onClick={handleGeminiAnalysis}
          disabled={isAnalyzing}
          className="w-full bg-white text-indigo-700 font-bold py-3 px-6 rounded-xl shadow hover:bg-indigo-50 transition-colors disabled:opacity-70 flex items-center justify-center space-x-2"
        >
          {isAnalyzing ? (
            <>
              <div className="w-5 h-5 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin"></div>
              <span>正在分析数据...</span>
            </>
          ) : (
            <>
              <Lightbulb className="w-5 h-5" />
              <span>生成健康报告</span>
            </>
          )}
        </button>
      </div>

      {aiAnalysis && (
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 prose prose-slate max-w-none">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
             <span className="text-xl">📋</span> 分析结果
          </h3>
          <div className="mt-4 text-slate-600 whitespace-pre-wrap leading-relaxed">
             {aiAnalysis}
          </div>
        </div>
      )}
    </div>
  );

  const renderHardwareGuide = () => (
    <div className="animate-in fade-in space-y-8 max-w-4xl mx-auto pb-10">
      <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
        <h2 className="text-blue-800 font-bold flex items-center gap-2 mb-2">
          <Cpu className="w-5 h-5" />
          保姆级安装向导
        </h2>
        <p className="text-sm text-blue-700">
          请严格按照以下步骤操作。我们使用“面包板”进行免焊接连接，安全且容易上手。
          整个系统使用 5V 低压供电（手机充电头即可），非常安全。
        </p>
      </div>

      {/* Step 1: Shopping List */}
      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-green-600" />
          第一步：材料准备 (缺一不可)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: "ESP32 开发板", desc: "Type-C 接口版本", price: "¥18" },
            { name: "面包板 (8.5x5.5cm)", desc: "用于插线，免焊接", price: "¥5" },
            { name: "杜邦线 (公对公 + 公对母)", desc: "买一捆混合装", price: "¥5" },
            { name: "DHT22 温湿度传感器", desc: "带底座版(3个针脚)", price: "¥12" },
            { name: "4路 5V 继电器模块", desc: "带光耦隔离", price: "¥8" },
            { name: "5V USB 风扇", desc: "剪断USB线使用", price: "¥9" },
            { name: "5V 紫外线灯条", desc: "USB供电款", price: "¥15" }
          ].map((item, idx) => (
            <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <div>
                <p className="font-bold text-slate-800">{item.name}</p>
                <p className="text-xs text-slate-500 mt-1">{item.desc}</p>
              </div>
              <div className="mt-3 flex justify-between items-end">
                <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-1 rounded">淘宝搜</span>
                <span className="font-mono text-green-600 font-bold">{item.price}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Step 2: Wiring Diagram Logic */}
      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <CircuitBoard className="w-5 h-5 text-purple-600" />
          第二步：详细接线图 (按顺序插线)
        </h3>
        
        <div className="space-y-6">
          {/* Power Logic */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
               <Plug className="w-4 h-4 text-orange-500"/> 1. 供电总线 (基础)
             </h4>
             <div className="text-sm text-slate-600 space-y-2 pl-6 border-l-2 border-orange-200">
               <p>将 <span className="font-bold text-slate-900">ESP32</span> 插在面包板中间。</p>
               <p>ESP32 <span className="font-mono bg-slate-100 px-1">GND</span> 引脚 → 连接到面包板 <span className="text-blue-600 font-bold">蓝色(-)</span> 导轨。</p>
               <p>ESP32 <span className="font-mono bg-slate-100 px-1">VIN</span> (或5V) 引脚 → 连接到面包板 <span className="text-red-600 font-bold">红色(+)</span> 导轨。</p>
               <p className="text-xs text-orange-600 bg-orange-50 p-2 rounded">注意：之后所有设备的“负极/GND”都插蓝色排，“正极/VCC”都插红色排。</p>
             </div>
          </div>

          {/* Sensor Logic */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
               <Thermometer className="w-4 h-4 text-blue-500"/> 2. 连接 DHT22 传感器
             </h4>
             <div className="text-sm text-slate-600 space-y-2 pl-6 border-l-2 border-blue-200">
               <p>传感器 <span className="font-mono">VCC (+)</span> → 面包板 <span className="text-red-600 font-bold">红色(+)</span></p>
               <p>传感器 <span className="font-mono">GND (-)</span> → 面包板 <span className="text-blue-600 font-bold">蓝色(-)</span></p>
               <p>传感器 <span className="font-mono">DAT (Out)</span> → ESP32 <span className="font-bold text-slate-900">D15</span> (GPIO 15)</p>
             </div>
          </div>

          {/* Relay Control Logic */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
             <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
               <Cable className="w-4 h-4 text-purple-500"/> 3. 连接继电器 (控制中心)
             </h4>
             <div className="text-sm text-slate-600 space-y-2 pl-6 border-l-2 border-purple-200">
               <p className="font-semibold text-slate-800">控制端 (连接到 ESP32):</p>
               <p>继电器 <span className="font-mono">VCC</span> → 面包板 <span className="text-red-600 font-bold">红色(+)</span></p>
               <p>继电器 <span className="font-mono">GND</span> → 面包板 <span className="text-blue-600 font-bold">蓝色(-)</span></p>
               <p>继电器 <span className="font-mono">IN1</span> → ESP32 <span className="font-bold text-slate-900">D12</span> (控制风扇)</p>
               <p>继电器 <span className="font-mono">IN2</span> → ESP32 <span className="font-bold text-slate-900">D14</span> (控制UV灯)</p>
             </div>
          </div>

          {/* Fan Power Logic (The Tricky Part) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm ring-1 ring-yellow-200">
             <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
               <Wind className="w-4 h-4 text-green-600"/> 4. 连接风扇/灯 (输出端) - 关键步骤！
             </h4>
             <div className="text-sm text-slate-600 space-y-3 pl-6 border-l-2 border-green-200">
               <p className="bg-yellow-50 text-yellow-800 p-2 rounded text-xs">
                 原理：我们把继电器当成一个“剪刀”，剪断风扇的红色电线，然后接在继电器上。继电器闭合时，电线接通。
               </p>
               <ol className="list-decimal list-inside space-y-2">
                 <li>准备风扇：将 USB 风扇的线剪开，你会看到里面有<span className="text-red-600">红线(+)</span>和<span className="text-slate-800">黑线(-)</span>。</li>
                 <li><span className="font-bold text-slate-800">黑线 (GND)</span>：直接插入面包板 <span className="text-blue-600 font-bold">蓝色(-)</span> 导轨。</li>
                 <li><span className="font-bold text-red-600">红线 (VCC)</span>：<span className="font-bold underline">不要</span>直接接电源！请按照下面连接：
                    <ul className="list-disc list-inside pl-4 mt-1 text-slate-500">
                      <li>找一根线，从面包板 <span className="text-red-600 font-bold">红色(+)</span> 连到继电器的 <span className="font-mono text-slate-900 bg-slate-100 p-0.5 rounded">COM</span> (公共端，中间那个孔)。</li>
                      <li>将风扇的<span className="text-red-600">红线</span> 连到继电器的 <span className="font-mono text-slate-900 bg-slate-100 p-0.5 rounded">NO</span> (常开端)。</li>
                    </ul>
                 </li>
               </ol>
               <p className="text-xs text-slate-400 mt-2">UV 灯的接法完全一样，只是接到继电器的第二路 (COM2 / NO2)。</p>
             </div>
          </div>
        </div>
      </section>

      {/* Step 3: Code */}
      <section>
        <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Code className="w-5 h-5 text-orange-600" />
          第三步：烧录代码
        </h3>
        
        <div className="relative group">
          <div className="absolute top-4 right-4 z-10">
             <button 
               onClick={() => navigator.clipboard.writeText(arduinoCode)}
               className="bg-white/10 hover:bg-white/20 backdrop-blur text-white px-3 py-1 rounded border border-white/20 text-xs font-mono transition-colors"
             >
               复制代码
             </button>
          </div>
          <pre className="bg-slate-900 text-slate-300 p-6 rounded-xl text-xs font-mono overflow-x-auto h-96">
            {arduinoCode}
          </pre>
        </div>
      </section>
    </div>
  );

  return (
    <div className="min-h-screen pb-20 md:pb-0 font-sans">
      {/* Install Banner (Mobile) */}
      {showInstallBanner && !isIOS && (
         <div className="fixed top-0 left-0 right-0 bg-blue-600 text-white z-50 p-3 shadow-lg flex justify-between items-center animate-in slide-in-from-top">
            <div className="flex items-center space-x-3">
               <div className="bg-white/20 p-1.5 rounded-lg">
                  <Download className="w-5 h-5" />
               </div>
               <div className="text-sm">
                  <p className="font-bold">安装“衣柜卫士”APP</p>
                  <p className="text-xs text-blue-100">更流畅、支持离线访问</p>
               </div>
            </div>
            <div className="flex items-center space-x-2">
               <button onClick={() => setShowInstallBanner(false)} className="p-1 opacity-70 hover:opacity-100">
                  <X className="w-5 h-5"/>
               </button>
               <button onClick={handleInstallClick} className="bg-white text-blue-600 text-xs font-bold px-3 py-1.5 rounded-full">
                  立即安装
               </button>
            </div>
         </div>
      )}

      {/* Header */}
      <header className={`bg-white border-b border-slate-200 sticky z-10 transition-all ${showInstallBanner ? 'top-14' : 'top-0'}`}>
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center space-x-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-200">
               衣
             </div>
             <span className="font-bold text-slate-800 text-lg tracking-tight">智能衣柜卫士</span>
          </div>
          <div className="flex items-center space-x-2">
             <div className={`w-2 h-2 rounded-full ${sensors.humidity > thresholds.maxHumidity ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
             <span className="text-xs font-medium text-slate-500">
               {sensors.humidity > thresholds.maxHumidity ? '湿度过高' : '系统正常'}
             </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === AppTab.DASHBOARD && renderDashboard()}
        {activeTab === AppTab.HISTORY && renderHistory()}
        {activeTab === AppTab.SETTINGS && renderSettings()}
        {activeTab === AppTab.AI_INSIGHTS && renderAI()}
        {activeTab === AppTab.HARDWARE_GUIDE && renderHardwareGuide()}
      </main>

      {/* Bottom Navigation (Mobile Style) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-6 py-2 flex justify-between items-center md:hidden z-20 pb-safe">
        <button 
          onClick={() => setActiveTab(AppTab.DASHBOARD)}
          className={`p-2 rounded-xl flex flex-col items-center space-y-1 ${activeTab === AppTab.DASHBOARD ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <LayoutDashboard className="w-6 h-6" />
          <span className="text-[10px] font-medium">主页</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.HISTORY)}
          className={`p-2 rounded-xl flex flex-col items-center space-y-1 ${activeTab === AppTab.HISTORY ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] font-medium">日志</span>
        </button>
        <button 
          onClick={() => setActiveTab(AppTab.AI_INSIGHTS)}
          className={`p-2 rounded-xl flex flex-col items-center space-y-1 ${activeTab === AppTab.AI_INSIGHTS ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Bot className="w-6 h-6" />
          <span className="text-[10px] font-medium">AI</span>
        </button>
         <button 
          onClick={() => setActiveTab(AppTab.HARDWARE_GUIDE)}
          className={`p-2 rounded-xl flex flex-col items-center space-y-1 ${activeTab === AppTab.HARDWARE_GUIDE ? 'text-blue-600' : 'text-slate-400'}`}
        >
          <Cpu className="w-6 h-6" />
          <span className="text-[10px] font-medium">教程</span>
        </button>
      </nav>

      {/* Desktop Sidebar / Navigation (Optional enhancement for larger screens) */}
      <div className="hidden md:flex fixed top-24 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md border border-slate-200 rounded-full px-6 py-2 shadow-sm space-x-2 z-20">
         <button 
           onClick={() => setActiveTab(AppTab.DASHBOARD)}
           className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors ${activeTab === AppTab.DASHBOARD ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
         >
            <LayoutDashboard className="w-4 h-4" />
            <span>仪表盘</span>
         </button>
         <button 
           onClick={() => setActiveTab(AppTab.HISTORY)}
           className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors ${activeTab === AppTab.HISTORY ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
         >
            <History className="w-4 h-4" />
            <span>历史记录</span>
         </button>
         <button 
           onClick={() => setActiveTab(AppTab.AI_INSIGHTS)}
           className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors ${activeTab === AppTab.AI_INSIGHTS ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
         >
            <Bot className="w-4 h-4" />
            <span>AI 顾问</span>
         </button>
         <button 
           onClick={() => setActiveTab(AppTab.SETTINGS)}
           className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors ${activeTab === AppTab.SETTINGS ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
         >
            <Settings className="w-4 h-4" />
            <span>设置</span>
         </button>
          <div className="w-px h-6 bg-slate-300 mx-2"></div>
          <button 
           onClick={() => setActiveTab(AppTab.HARDWARE_GUIDE)}
           className={`flex items-center space-x-2 py-2 px-4 rounded-full transition-colors ${activeTab === AppTab.HARDWARE_GUIDE ? 'bg-slate-100 text-slate-900 font-semibold' : 'text-slate-500 hover:text-slate-900'}`}
         >
            <Cpu className="w-4 h-4" />
            <span>安装指南</span>
         </button>
      </div>
    </div>
  );
};

// --- Embedded Arduino Code ---
const arduinoCode = `
// 智能衣柜 ESP32 固件代码 (复制即用)
// 需要库: DHT sensor library, PubSubClient

#include <WiFi.h>
#include <PubSubClient.h>
#include <DHT.h>

// 1. 配置您的 Wi-Fi
const char* ssid = "您的WiFi名称";
const char* password = "您的WiFi密码";

// 2. 配置 MQTT 服务器 (这里使用免费公共服务器测试)
const char* mqtt_server = "broker.emqx.io";

// 3. 引脚定义
#define DHTPIN 15     // 温湿度传感器接 D15
#define DHTTYPE DHT22
#define RELAY_FAN 12  // 风扇接 D12
#define RELAY_UV 14   // 紫外灯接 D14

DHT dht(DHTPIN, DHTTYPE);
WiFiClient espClient;
PubSubClient client(espClient);

void setup() {
  Serial.begin(115200);
  dht.begin();
  pinMode(RELAY_FAN, OUTPUT);
  pinMode(RELAY_UV, OUTPUT);
  
  // 默认关闭设备
  digitalWrite(RELAY_FAN, LOW); 
  digitalWrite(RELAY_UV, LOW);

  setup_wifi();
  client.setServer(mqtt_server, 1883);
  client.setCallback(callback);
}

void loop() {
  if (!client.connected()) {
    reconnect();
  }
  client.loop();

  // 每2秒读取一次数据并上传
  static unsigned long lastMsg = 0;
  unsigned long now = millis();
  if (now - lastMsg > 2000) {
    lastMsg = now;
    
    float h = dht.readHumidity();
    float t = dht.readTemperature();

    if (isnan(h) || isnan(t)) {
      Serial.println("读取传感器失败!");
      return;
    }

    // 构建 JSON 字符串 (这里简化为手动拼接)
    String payload = "{\\"temp\\": " + String(t) + ", \\"humidity\\": " + String(h) + "}";
    client.publish("wardrobe/sensor", payload.c_str());
  }
}

// 处理收到的控制指令
void callback(char* topic, byte* payload, unsigned int length) {
  String msg;
  for (int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  
  if (String(topic) == "wardrobe/control") {
    if (msg == "FAN_ON") digitalWrite(RELAY_FAN, HIGH);
    if (msg == "FAN_OFF") digitalWrite(RELAY_FAN, LOW);
    if (msg == "UV_ON") digitalWrite(RELAY_UV, HIGH);
    if (msg == "UV_OFF") digitalWrite(RELAY_UV, LOW);
  }
}

void setup_wifi() {
  delay(10);
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
  }
}

void reconnect() {
  while (!client.connected()) {
    String clientId = "ESP32WardrobeClient-";
    clientId += String(random(0xffff), HEX);
    if (client.connect(clientId.c_str())) {
      client.subscribe("wardrobe/control");
    } else {
      delay(5000);
    }
  }
}
`;

export default App;