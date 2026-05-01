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
    arrivalRate: 1.8,
    dishRatio: 'A:40%, B:35%, C:25%',
    averagePrepMinutes: 5.5,
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
    const timer = setInterval(refreshAll, 6000)
    return () => clearInterval(timer)
  }, [])

  const callSimulation = async (path: string, method: 'POST' | 'PUT' = 'POST', body?: unknown) => {
    const response = await fetch(`${API_BASE}${path}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    })
    const data = await response.json()
    setDashboard(data)
  }

  const saveParameters = async () => {
    await callSimulation('/simulation/parameters', 'PUT', dashboard.parameters)
    setNotice('参数已保存到当前仿真会话。')
  }

  const renderLine = (values: number[], denominator = 1) => (
    <div className="mini-chart">
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="mini-bar"
          style={{ height: `${18 + (value / denominator) * 72}px` }}
          title={`${value}`}
        />
      ))}
    </div>
  )

  return (
    <div className="page-shell">
      <aside className="sidebar-card">
        <div>
          <div className="brand-title">北平食堂大学</div>
          <h1>就餐仿真系统</h1>
          <p>开发阶段代码版本：保留数据面板与仿真控制功能。</p>
        </div>
        <nav className="nav-stack">
          <button className="nav-button active" type="button">数据面板</button>
        </nav>
        <div className="status-card">
          <span className={status?.online ? 'badge success' : 'badge danger'}>{status?.online ? '服务在线' : '服务离线'}</span>
          <p>{status?.online ? '服务正在运行' : '服务当前不可用'}</p>
          <button className="secondary-button" onClick={refreshAll}>刷新状态</button>
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
                <p>覆盖规格说明中要求的平均排队长度、等待时间、厨师利用率和座位周转率。</p>
              </div>
            </div>
            <div className="chart-group">
              <div className="chart-card">
                <span>平均排队长度</span>
                {renderLine(dashboard.history.map((item) => item.queueLength), 10)}
              </div>
              <div className="chart-card">
                <span>顾客等待时间</span>
                {renderLine(dashboard.history.map((item) => item.waitMinutes), 20)}
              </div>
              <div className="chart-card">
                <span>厨师利用率</span>
                {renderLine(dashboard.history.map((item) => item.chefUtilization), 1)}
              </div>
              <div className="chart-card">
                <span>座位周转率</span>
                {renderLine(dashboard.history.map((item) => item.seatTurnoverRate), 4)}
              </div>
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-head compact">
              <div>
                <h3>仿真数据管理</h3>
                <p>支持暂停、继续、重置仿真和调整参数。</p>
              </div>
            </div>
            <div className="action-row wrap">
              <button className="primary-button" onClick={() => callSimulation('/simulation/start')}>开始</button>
              <button className="secondary-button" onClick={() => callSimulation('/simulation/pause')}>暂停</button>
              <button className="secondary-button" onClick={() => callSimulation('/simulation/reset')}>重置</button>
            </div>
            <div className="parameter-grid">
              <label>
                <span className="label-text">仿真总时长</span>
                <div className="input-with-unit">
                  <input type="number" value={dashboard.parameters.simulationDurationMinutes} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, simulationDurationMinutes: Number(e.target.value) } }))} />
                  <span className="input-unit">分钟</span>
                </div>
              </label>
              <label>
                <span className="label-text">顾客到达率</span>
                <div className="input-with-unit">
                  <input type="number" step="0.1" value={dashboard.parameters.arrivalRate} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, arrivalRate: Number(e.target.value) } }))} />
                  <span className="input-unit">人/分钟</span>
                </div>
              </label>
              <label>
                <span className="label-text">窗口数量</span>
                <div className="input-with-unit">
                  <input type="number" value={dashboard.parameters.windowCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, windowCount: Number(e.target.value) } }))} />
                  <span className="input-unit">个</span>
                </div>
              </label>
              <label>
                <span className="label-text">厨师数量</span>
                <div className="input-with-unit">
                  <input type="number" value={dashboard.parameters.chefCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, chefCount: Number(e.target.value) } }))} />
                  <span className="input-unit">人</span>
                </div>
              </label>
              <label>
                <span className="label-text">座位数量</span>
                <div className="input-with-unit">
                  <input type="number" value={dashboard.parameters.seatCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, seatCount: Number(e.target.value) } }))} />
                  <span className="input-unit">个</span>
                </div>
              </label>
            </div>
            <button className="primary-button full" onClick={saveParameters}>保存仿真参数</button>
          </div>
          <div className="panel-card">
            <div className="panel-head compact">
              <div>
                <h3>仿真控制</h3>
                <p>支持暂停、继续、重置仿真和调整参数。</p>
              </div>
            </div>
            <div className="action-row wrap">
              <button className="primary-button" onClick={() => callSimulation('/simulation/start')}>开始</button>
              <button className="secondary-button" onClick={() => callSimulation('/simulation/pause')}>暂停</button>
              <button className="secondary-button" onClick={() => callSimulation('/simulation/reset')}>重置</button>
            </div>
            <div className="parameter-grid">
              <label>
                <span className="label-text">仿真总时长</span>
                <div className="input-with-unit">
                  <input type="number" value={dashboard.parameters.simulationDurationMinutes} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, simulationDurationMinutes: Number(e.target.value) } }))} />
                  <span className="input-unit">分钟</span>
                </div>
              </label>
              <label>
                <span className="label-text">顾客到达率</span>
                <div className="input-with-unit">
                  <input type="number" step="0.1" value={dashboard.parameters.arrivalRate} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, arrivalRate: Number(e.target.value) } }))} />
                  <span className="input-unit">人/分钟</span>
                </div>
              </label>
              <label>
                <span className="label-text">窗口数量</span>
                <div className="input-with-unit">
                  <input type="number" value={dashboard.parameters.windowCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, windowCount: Number(e.target.value) } }))} />
                  <span className="input-unit">个</span>
                </div>
              </label>
              <label>
                <span className="label-text">厨师数量</span>
                <div className="input-with-unit">
                  <input type="number" value={dashboard.parameters.chefCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, chefCount: Number(e.target.value) } }))} />
                  <span className="input-unit">人</span>
                </div>
              </label>
              <label>
                <span className="label-text">座位数量</span>
                <div className="input-with-unit">
                  <input type="number" value={dashboard.parameters.seatCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, seatCount: Number(e.target.value) } }))} />
                  <span className="input-unit">个</span>
                </div>
              </label>
            </div>
            <button className="primary-button full" onClick={saveParameters}>保存仿真参数</button>
          </div>

          <div className="panel-card large">
            <div className="panel-head compact">
              <div>
                <h3>最近顾客事件流</h3>
                <p>展示到达、排队、就餐与离场的关键状态，满足“事件流”开发要求。</p>
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
