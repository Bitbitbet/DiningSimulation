import { useEffect, useState } from 'react'

type StatusResponse = {
  online: boolean
}

type WindowDto = {
  id: number
  chefId: number
  queue: number[]
  status: string
  serveRate: number
  dishType: string
  estimatedWaitMinutes: number
}

type ChefDto = {
  id: number
  skill: string
  currentOrder: number | null
  status: string
  utilization: number
}

type SeatDto = {
  id: number
  occupiedBy: number | null
  zone: string
}

type CustomerDto = {
  id: number
  arriveTime: number
  orderType: string
  prepTime: number
  eatTime: number
  windowId: number
  queueStart: number
  queueEnd: number
  eatStart: number
  leaveTime: number
  status: string
}

type SimulationParameters = {
  simulationDurationMinutes: number
  arrivalRate: number
  dishRatio: string
  averagePrepMinutes: number
  averageEatMinutes: number
  windowCount: number
  chefCount: number
  seatCount: number
  autoLeaveWhenFull: boolean
}

type HistoryPoint = {
  time: string
  queueLength: number
  waitMinutes: number
  chefUtilization: number
  seatTurnoverRate: number
  seatIdleRate: number
  congestionRate: number
}

type DashboardResponse = {
  simulationState: string
  simulationSpeed: number
  currentTimeMinute: number
  averageQueueLength: number
  averageWaitMinutes: number
  chefUtilization: number
  seatTurnoverRate: number
  seatIdleRate: number
  congestionRate: number
  windows: WindowDto[]
  chefs: ChefDto[]
  seats: SeatDto[]
  recentCustomers: CustomerDto[]
  history: HistoryPoint[]
  parameters: SimulationParameters
}

const API_BASE = 'http://localhost:23456/api'

const emptyDashboard: DashboardResponse = {
  simulationState: '未开始',
  simulationSpeed: 1,
  currentTimeMinute: 0,
  averageQueueLength: 0,
  averageWaitMinutes: 0,
  chefUtilization: 0,
  seatTurnoverRate: 0,
  seatIdleRate: 0,
  congestionRate: 0,
  windows: [],
  chefs: [],
  seats: [],
  recentCustomers: [],
  history: [],
  parameters: {
    simulationDurationMinutes: 180,
    arrivalRate: 0.6,
    dishRatio: 'A:40%, B:35%, C:25%',
    averagePrepMinutes: 3.5,
    averageEatMinutes: 24,
    windowCount: 4,
    chefCount: 4,
    seatCount: 24,
    autoLeaveWhenFull: false,
  },
}

export default function App() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
  const [notice, setNotice] = useState('')
  const [tickPerSecond, setTickPerSecond] = useState(1)

  const refreshAll = async () => {
    try {
      const [statusRes, dashboardRes] = await Promise.all([
        fetch(`${API_BASE}/status`).then((res) => res.json()),
        fetch(`${API_BASE}/dashboard`).then((res) => res.json()),
      ])
      setStatus(statusRes)
      setDashboard(dashboardRes)
    } catch {
      setStatus({ online: false })
    }
  }

  useEffect(() => {
    refreshAll()
    const timer = setInterval(refreshAll, 3000)
    return () => clearInterval(timer)
  }, [])

  const callSimulation = async (path: string, method: 'POST' | 'PUT' | 'DELETE' = 'POST', body?: unknown) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json()
    setDashboard(data)
  }

  const updateParam = <K extends keyof SimulationParameters>(key: K, value: SimulationParameters[K]) => {
    setDashboard((prev) => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [key]: value,
      },
    }))
  }

  const saveParameters = async () => {
    await callSimulation('/simulation/parameters', 'PUT', dashboard.parameters)
    setNotice('参数已保存，并重新生成当前仿真会话。')
  }

  const updateSpeed = async (value: number) => {
    setTickPerSecond(value)
    await callSimulation('/simulation/speed', 'PUT', { tickPerSecond: value })
    setNotice(`仿真速度已调整为每秒 ${value} 次推进。`)
  }

  const clearRuntimeData = async () => {
    await callSimulation('/datasets/clear', 'DELETE')
    setNotice('已清空当前运行数据和数据库中的顾客事件、历史指标。')
  }

  const downloadDashboard = () => {
    const blob = new Blob([JSON.stringify(dashboard, null, 2)], { type: 'application/json;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `canteen-simulation-${Date.now()}.json`
    link.click()
    URL.revokeObjectURL(url)
    setNotice('当前仿真数据已导出为 JSON 文件。')
  }

  const recentHistory = dashboard.history.slice(-10)

  const renderLine = (values: number[], baseDenominator = 1) => {
    const maxValue = Math.max(baseDenominator, ...values, 1)
    return (
      <div className="mini-chart">
        {values.map((value, index) => {
          const ratio = Math.max(0, Math.min(1, value / maxValue))
          const height = 14 + ratio * 82
          return (
            <div
              key={`${value}-${index}`}
              className="mini-bar"
              style={{ height: `${height}px` }}
              title={`${value}`}
            />
          )
        })}
      </div>
    )
  }

  const parameterInput = (
    label: string,
    key: keyof SimulationParameters,
    unit: string,
    options: { min?: number; max?: number; step?: number } = {},
  ) => (
    <label>
      <span className="label-text">{label}</span>
      <div className="input-with-unit">
        <input
          type="number"
          min={options.min}
          max={options.max}
          step={options.step ?? 1}
          value={String(dashboard.parameters[key])}
          onChange={(e) => {
            const nextValue = Number(e.target.value)
            updateParam(key, nextValue as never)
          }}
        />
        <span className="input-unit">{unit}</span>
      </div>
    </label>
  )

  return (
    <div className="page-shell">
      <aside className="sidebar-card">
        <div>
          <div className="brand-title">北京交通大学</div>
          <h1>食堂就餐仿真系统</h1>
          <p>开发阶段版本：支持食堂就餐仿真、数据面板展示、仿真控制和运行数据保存。</p>
        </div>
        <nav className="nav-stack">
          <button className="nav-button active" type="button">数据面板</button>
        </nav>
        <div className="status-card">
          <span className={status?.online ? 'badge success' : 'badge danger'}>{status?.online ? '服务在线' : '服务离线'}</span>
          <p>{status?.online ? '后端服务正在运行' : '后端服务当前不可用'}</p>
          <button className="secondary-button" type="button" onClick={refreshAll}>刷新状态</button>
        </div>
      </aside>

      <main className="content-shell">
        <header className="top-card">
          <div>
            <div className="muted-label">B/S 架构 · React + Java</div>
            <h2>数据面板展示界面</h2>
          </div>
          <div className="header-actions">
            <span className="time-chip">当前仿真时钟：{dashboard.currentTimeMinute} 分钟</span>
            <span className="time-chip">状态：{dashboard.simulationState}</span>
          </div>
        </header>

        {notice ? <div className="notice-banner">{notice}</div> : null}

        <section className="view-grid dashboard-grid">
          <div className="panel-card metrics-strip">
            {[
              ['平均排队长度', `${dashboard.averageQueueLength} 人`],
              ['顾客等待时间', `${dashboard.averageWaitMinutes} 分钟`],
              ['厨师利用率', `${Math.round(dashboard.chefUtilization * 100)}%`],
              ['座位周转率', `${dashboard.seatTurnoverRate} 次/时段`],
              ['座位空置率', `${Math.round(dashboard.seatIdleRate * 100)}%`],
              ['拥堵程度', `${Math.round(dashboard.congestionRate * 100)}%`],
            ].map(([label, value]) => (
              <div key={label} className="metric-card">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className="panel-card large">
            <div className="panel-head">
              <div>
                <h3>历史指标趋势</h3>
              </div>
            </div>
            <div className="chart-group">
              <div className="chart-card">
                <span>平均排队长度</span>
                {renderLine(recentHistory.map((item) => item.queueLength), 10)}
              </div>
              <div className="chart-card">
                <span>顾客等待时间</span>
                {renderLine(recentHistory.map((item) => item.waitMinutes), 20)}
              </div>
              <div className="chart-card">
                <span>厨师利用率</span>
                {renderLine(recentHistory.map((item) => item.chefUtilization), 1)}
              </div>
              <div className="chart-card">
                <span>座位周转率</span>
                {renderLine(recentHistory.map((item) => item.seatTurnoverRate), 4)}
              </div>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-head compact">
              <div>
                <h3>仿真数据管理</h3>
                <p>管理已生成的仿真数据，支持选择、下载、刷新和清空。</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>数据名称</th>
                    <th>来源</th>
                    <th>记录数</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>当前运行数据</td>
                    <td>本次仿真</td>
                    <td>{dashboard.recentCustomers.length}</td>
                    <td><button className="secondary-button" type="button" onClick={() => setNotice('已选择当前运行数据。')}>选择</button></td>
                  </tr>
                  <tr>
                    <td>历史指标数据</td>
                    <td>后端统计</td>
                    <td>{dashboard.history.length}</td>
                    <td><button className="secondary-button" type="button" onClick={() => setNotice('已选择历史指标数据。')}>选择</button></td>
                  </tr>
                  <tr>
                    <td>窗口队列数据</td>
                    <td>仿真窗口</td>
                    <td>{dashboard.windows.length}</td>
                    <td><button className="secondary-button" type="button" onClick={() => setNotice('已选择窗口队列数据。')}>选择</button></td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="action-row wrap">
              <button className="primary-button" type="button" onClick={() => setNotice('上传数据功能后续接入。')}>上传数据</button>
              <button className="secondary-button" type="button" onClick={downloadDashboard}>下载数据</button>
              <button className="secondary-button" type="button" onClick={refreshAll}>刷新数据</button>
              <button className="secondary-button danger-button" type="button" onClick={clearRuntimeData}>清空数据</button>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-head compact">
              <div>
                <h3>仿真控制</h3>
                <p>控制仿真开始、暂停、重置，并调整仿真速度与参数。</p>
              </div>
            </div>
            <div className="action-row wrap">
              <button className="primary-button" type="button" onClick={() => callSimulation('/simulation/start')}>开始</button>
              <button className="secondary-button" type="button" onClick={() => callSimulation('/simulation/pause')}>暂停</button>
              <button className="secondary-button" type="button" onClick={() => callSimulation('/simulation/reset')}>重置</button>
            </div>

            <label className="range-label">
              <span className="label-text">仿真速度：每秒 {tickPerSecond} 次推进</span>
              <input
                type="range"
                min="1"
                max="10"
                step="1"
                value={tickPerSecond}
                onChange={(e) => updateSpeed(Number(e.target.value))}
              />
            </label>

            <div className="parameter-grid">
              {parameterInput('仿真总时长', 'simulationDurationMinutes', '分钟', { min: 1, step: 1 })}
              {parameterInput('顾客到达率', 'arrivalRate', '人/分钟', { min: 0.01, step: 0.05 })}
              {parameterInput('厨师平均做餐时间', 'averagePrepMinutes', '分钟/人', { min: 0.1, step: 0.1 })}
              {parameterInput('顾客平均就餐时间', 'averageEatMinutes', '分钟', { min: 1, step: 0.5 })}
              {parameterInput('窗口数量', 'windowCount', '个', { min: 1, step: 1 })}
              {parameterInput('厨师数量', 'chefCount', '人', { min: 1, step: 1 })}
              {parameterInput('座位数量', 'seatCount', '个', { min: 1, step: 1 })}
              <label>
                <span className="label-text">餐品比例</span>
                <input
                  type="text"
                  value={dashboard.parameters.dishRatio}
                  onChange={(e) => updateParam('dishRatio', e.target.value)}
                  placeholder="A:40%, B:35%, C:25%"
                />
              </label>
            </div>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={dashboard.parameters.autoLeaveWhenFull}
                onChange={(e) => updateParam('autoLeaveWhenFull', e.target.checked)}
              />
              <span>满座时顾客自动离开</span>
            </label>
            <button className="primary-button full" type="button" onClick={saveParameters}>保存仿真参数</button>
          </div>

          <div className="panel-card large">
            <div className="panel-head compact">
              <div>
                <h3>最近顾客事件流</h3>
                <p>展示最近最多 100 条到达、排队、就餐与离场事件；数据库不受该前端显示数量限制。</p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>餐品</th>
                    <th>窗口</th>
                    <th>排队开始</th>
                    <th>排队结束</th>
                    <th>实际等待</th>
                    <th>状态</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.recentCustomers.map((customer) => (
                    <tr key={customer.id}>
                      <td>{customer.id}</td>
                      <td>{customer.orderType}</td>
                      <td>{customer.windowId}</td>
                      <td>{customer.queueStart}</td>
                      <td>{customer.queueEnd}</td>
                      <td>{Math.max(0, customer.queueEnd - customer.queueStart).toFixed(1)}</td>
                      <td>{customer.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
