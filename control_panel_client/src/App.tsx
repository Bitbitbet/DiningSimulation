import { useState, useEffect } from "react";
import AppContext, { useAppContext } from "./AppContext";

export default function App() {
  const [content, setContent] = useState("Waiting for response...");
  const [isOnline, setIsOnline] = useState(false);

  const checkBackendStatus = async () => {
    try {
      const response = await fetch('http://localhost:23456/api/status');
      setIsOnline(response.ok);
    } catch {
      setIsOnline(false);
    }
  };

  useEffect(() => {
    checkBackendStatus();
    const interval = setInterval(checkBackendStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AppContext.Provider value={{ isOnline, checkBackendStatus }}>
      <Content />
    </AppContext.Provider>
  );
}

const Content = () => {
  const { isOnline } = useAppContext();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">餐厅预约主界面数据面板</h1>
            <p className="text-slate-600 mt-1">展示历史运营指标，并支持仿真控制、数据源切换与参数生成。</p>
            <div className="flex items-center gap-2 mt-2">
              <div className={`w-3 h-3 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className="text-sm text-slate-600">{isOnline ? '后端在线✅' : '后端离线🛑'}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 rounded-2xl bg-slate-900 text-white shadow">导出报表</button>
            <button className="px-4 py-2 rounded-2xl bg-white border shadow-sm">刷新数据</button>
          </div>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
          {[
            { title: '平均排队长度', value: '12.6 人', sub: '较昨日 -8%' },
            { title: '顾客等待时间', value: '18.4 分钟', sub: '高峰时段 26 分钟' },
            { title: '厨师利用率', value: '82%', sub: '晚餐峰值 91%' },
            { title: '座位周转率', value: '3.8 次/日', sub: '周同比 +0.4' },
            { title: '当前仿真速度', value: '2.0x', sub: '可实时调整' },
          ].map((item) => (
            <div key={item.title} className="bg-white rounded-2xl shadow-sm border p-4">
              <div className="text-sm text-slate-500">{item.title}</div>
              <div className="text-2xl font-semibold mt-2">{item.value}</div>
              <div className="text-sm text-slate-600 mt-1">{item.sub}</div>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">历史趋势总览</h2>
                <p className="text-sm text-slate-500">座位空置率、拥堵情况、等待与利用率等核心指标</p>
              </div>
              <select className="border rounded-xl px-3 py-2 bg-white text-sm">
                <option>最近 7 天</option>
                <option>最近 30 天</option>
                <option>最近 90 天</option>
              </select>
            </div>

            <div className="h-80 rounded-2xl border border-dashed flex items-center justify-center text-slate-400 bg-slate-50">
              折线图 / 面积图区域（历史座位空置率、拥堵情况、等待时间、厨师利用率、座位周转率）
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="rounded-2xl border p-4 bg-slate-50">
                <div className="font-medium">座位空置率热力视图</div>
                <div className="text-sm text-slate-500 mt-1">按时段显示空置率，便于发现高峰与低谷</div>
                <div className="mt-3 h-32 rounded-xl border border-dashed flex items-center justify-center text-slate-400">热力图区域</div>
              </div>
              <div className="rounded-2xl border p-4 bg-slate-50">
                <div className="font-medium">拥堵情况分布</div>
                <div className="text-sm text-slate-500 mt-1">展示各时间段的拥堵等级与峰值分布</div>
                <div className="mt-3 h-32 rounded-xl border border-dashed flex items-center justify-center text-slate-400">柱状图区域</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-5 space-y-5">
            <div>
              <h2 className="text-xl font-semibold">仿真控制</h2>
              <p className="text-sm text-slate-500">控制仿真运行状态、速度与数据源</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">仿真速度</label>
              <input type="range" min="0.5" max="5" step="0.5" defaultValue="2" className="w-full" />
              <div className="flex justify-between text-sm text-slate-500">
                <span>0.5x</span>
                <span>2.0x</span>
                <span>5.0x</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button className="flex-1 px-4 py-2 rounded-2xl bg-green-600 text-white shadow">开始</button>
              <button className="flex-1 px-4 py-2 rounded-2xl bg-rose-600 text-white shadow">停止</button>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium">仿真数据来源</label>
              <div className="grid grid-cols-2 gap-3">
                <button className="px-4 py-2 rounded-2xl border bg-slate-900 text-white">生成数据</button>
                <button className="px-4 py-2 rounded-2xl border bg-white">导入数据</button>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 border p-4 space-y-3">
              <div className="font-medium">运行状态</div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">当前状态</span>
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">已暂停</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">当前场景</span>
                <span>周末晚高峰</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">数据窗口</span>
                <span>18:00 - 21:00</span>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">仿真数据生成参数</h2>
                <p className="text-sm text-slate-500">当选择“生成数据”时，可调节客流、桌型、服务节奏等参数</p>
              </div>
              <button className="px-4 py-2 rounded-2xl bg-slate-900 text-white">生成新样本</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                ['到店人数均值', '80'],
                ['到店波动系数', '0.35'],
                ['大桌占比', '25%'],
                ['平均用餐时长', '64 分钟'],
                ['厨师数量', '6'],
                ['服务员数量', '8'],
                ['预约到店率', '87%'],
                ['Walk-in 占比', '22%'],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl border p-4 bg-slate-50">
                  <div className="text-sm text-slate-500">{label}</div>
                  <input defaultValue={value} className="mt-2 w-full rounded-xl border bg-white px-3 py-2" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border p-5">
            <h2 className="text-xl font-semibold mb-4">导入数据</h2>
            <div className="border-2 border-dashed rounded-2xl p-6 text-center bg-slate-50 text-slate-500">
              拖拽 CSV / Excel 文件到此处
              <div className="mt-3">
                <button className="px-4 py-2 rounded-2xl bg-white border">选择文件</button>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">最近导入</span>
                <span>reservation_peak.csv</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">记录数</span>
                <span>12,480</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">字段校验</span>
                <span className="text-green-600">通过</span>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl shadow-sm border p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold">实时仿真结果面板</h2>
              <p className="text-sm text-slate-500">运行仿真时动态观察排队、等待、利用率与座位分配结果</p>
            </div>
            <button className="px-4 py-2 rounded-2xl bg-white border">切换布局</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              '当前排队人数',
              '预测 30 分钟等待时长',
              '当前厨师负载',
              '预计座位释放数量',
            ].map((title) => (
              <div key={title} className="rounded-2xl border bg-slate-50 p-4 h-28 flex flex-col justify-between">
                <div className="text-sm text-slate-500">{title}</div>
                <div className="text-2xl font-semibold">--</div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};