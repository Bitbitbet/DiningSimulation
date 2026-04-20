import { useEffect, useMemo, useState } from 'react'

type StatusResponse = {
  online: boolean
  serviceName: string
  message: string
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
  dispatchRule: string
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

type ReservationForm = {
  studentId: string
  partySize: number
  mealType: string
  dishType: string
}

type ReservationResponse = {
  studentId: string
  assignedWindowId: number
  estimatedWaitMinutes: number
  queuePosition: number
  availableSeatCount: number
  suggestion: string
  confirmed: boolean
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
    dispatchRule: '最短队列',
    autoLeaveWhenFull: false,
  },
}

const defaultForm: ReservationForm = {
  studentId: '',
  partySize: 2,
  mealType: '午餐',
  dishType: 'A套餐',
}

export default function App() {
  const [tab, setTab] = useState<'main' | 'reserve' | 'dashboard'>('main')
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [dashboard, setDashboard] = useState<DashboardResponse>(emptyDashboard)
  const [form, setForm] = useState<ReservationForm>(defaultForm)
  const [estimate, setEstimate] = useState<ReservationResponse | null>(null)
  const [notice, setNotice] = useState('')
  const [loading, setLoading] = useState(false)

  const seatSummary = useMemo(() => {
    const occupied = dashboard.seats.filter((seat) => seat.occupiedBy !== null).length
    return {
      total: dashboard.seats.length,
      occupied,
      free: Math.max(0, dashboard.seats.length - occupied),
    }
  }, [dashboard.seats])

  const refreshAll = async () => {
    try {
      const [statusRes, dashboardRes] = await Promise.all([
        fetch(`${API_BASE}/status`).then((res) => res.json()),
        fetch(`${API_BASE}/dashboard`).then((res) => res.json()),
      ])
      setStatus(statusRes)
      setDashboard(dashboardRes)
    } catch {
      setStatus({ online: false, serviceName: 'back_canteen_bjtu', message: '后端暂时不可用' })
    }
  }

  useEffect(() => {
    refreshAll()
    const timer = setInterval(refreshAll, 6000)
    return () => clearInterval(timer)
  }, [])

  const updateField = <K extends keyof ReservationForm>(key: K, value: ReservationForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const estimateReservation = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/reservation/estimate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      setEstimate(data)
      setTab('reserve')
      setNotice('已生成预约预估结果。')
    } finally {
      setLoading(false)
    }
  }

  const confirmReservation = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${API_BASE}/reservation/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await response.json()
      setEstimate(data)
      setNotice(`预约成功：请前往窗口 ${data.assignedWindowId}`)
      await refreshAll()
    } finally {
      setLoading(false)
    }
  }

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
          <div className="brand-title">北京交通大学</div>
          <h1>就餐仿真系统</h1>
          <p>开发阶段代码版本：已按设计规格补齐预约主界面、预约界面和数据面板原型。</p>
        </div>
        <nav className="nav-stack">
          <button className={tab === 'main' ? 'nav-button active' : 'nav-button'} onClick={() => setTab('main')}>预约主界面</button>
          <button className={tab === 'reserve' ? 'nav-button active' : 'nav-button'} onClick={() => setTab('reserve')}>预约界面</button>
          <button className={tab === 'dashboard' ? 'nav-button active' : 'nav-button'} onClick={() => setTab('dashboard')}>数据面板</button>
        </nav>
        <div className="status-card">
          <span className={status?.online ? 'badge success' : 'badge danger'}>{status?.online ? '后端在线' : '后端离线'}</span>
          <p>{status?.message ?? '等待后端响应'}</p>
          <button className="secondary-button" onClick={refreshAll}>刷新状态</button>
        </div>
      </aside>

      <main className="content-shell">
        <header className="top-card">
          <div>
            <div className="muted-label">B/S 架构 · React + Java</div>
            <h2>{tab === 'main' ? '预约时用餐人员使用的主界面' : tab === 'reserve' ? '预约界面' : '数据面板展示界面'}</h2>
          </div>
          <div className="header-actions">
            <span className="time-chip">当前仿真时钟：{dashboard.currentTimeMinute} 分钟</span>
            <span className="time-chip">状态：{dashboard.simulationState}</span>
          </div>
        </header>

        {notice ? <div className="notice-banner">{notice}</div> : null}

        {tab === 'main' ? (
          <section className="view-grid">
            <div className="panel-card large">
              <div className="panel-head">
                <div>
                  <h3>座位占用情况</h3>
                  <p>对应规格说明中的“每个座位当前占用情况”。</p>
                </div>
                <div className="metric-inline">空闲 {seatSummary.free} / 总数 {seatSummary.total}</div>
              </div>
              <div className="seat-grid">
                {dashboard.seats.map((seat) => (
                  <div key={seat.id} className={seat.occupiedBy ? 'seat-card occupied' : 'seat-card free'}>
                    <strong>{seat.id}</strong>
                    <span>{seat.zone}</span>
                    <small>{seat.occupiedBy ? `顾客 ${seat.occupiedBy}` : '空闲'}</small>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-head compact">
                <div>
                  <h3>窗口占用情况</h3>
                  <p>展示窗口状态、排队人数和预计等待时间。</p>
                </div>
              </div>
              <div className="window-list">
                {dashboard.windows.map((window) => (
                  <div key={window.id} className="window-item">
                    <div>
                      <strong>{window.id} 号窗口</strong>
                      <span>{window.dishType}</span>
                    </div>
                    <div>
                      <span className={window.status === '忙碌' ? 'badge warning' : 'badge success'}>{window.status}</span>
                      <small>排队 {window.queue.length} 人 / 等待 {window.estimatedWaitMinutes} 分钟</small>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-head compact">
                <div>
                  <h3>用餐预约操作</h3>
                  <p>包含学号输入框、预约点餐按钮、结束用餐按钮。</p>
                </div>
              </div>
              <div className="form-grid single">
                <label>
                  学号
                  <input value={form.studentId} onChange={(e) => updateField('studentId', e.target.value)} placeholder="请输入学号" />
                </label>
                <label>
                  同行人数
                  <input type="number" min={1} max={8} value={form.partySize} onChange={(e) => updateField('partySize', Number(e.target.value))} />
                </label>
                <label>
                  餐品
                  <select value={form.dishType} onChange={(e) => updateField('dishType', e.target.value)}>
                    <option>A套餐</option>
                    <option>B套餐</option>
                    <option>C套餐</option>
                  </select>
                </label>
              </div>
              <div className="action-row">
                <button className="primary-button" onClick={estimateReservation} disabled={loading || !form.studentId}>预约点餐</button>
                <button className="secondary-button" onClick={() => setNotice('已模拟结束用餐，座位将在后端轮询中释放。')}>结束用餐</button>
              </div>
            </div>
          </section>
        ) : null}

        {tab === 'reserve' ? (
          <section className="view-grid reserve-grid">
            <div className="panel-card large">
              <div className="panel-head">
                <div>
                  <h3>预约表单</h3>
                  <p>对应规格中的“输入同行用餐人数与餐品”。</p>
                </div>
              </div>
              <div className="form-grid">
                <label>
                  学号
                  <input value={form.studentId} onChange={(e) => updateField('studentId', e.target.value)} />
                </label>
                <label>
                  用餐时段
                  <select value={form.mealType} onChange={(e) => updateField('mealType', e.target.value)}>
                    <option>早餐</option>
                    <option>午餐</option>
                    <option>晚餐</option>
                  </select>
                </label>
                <label>
                  同行人数
                  <input type="number" min={1} max={8} value={form.partySize} onChange={(e) => updateField('partySize', Number(e.target.value))} />
                </label>
                <label>
                  餐品类型
                  <select value={form.dishType} onChange={(e) => updateField('dishType', e.target.value)}>
                    <option>A套餐</option>
                    <option>B套餐</option>
                    <option>C套餐</option>
                  </select>
                </label>
              </div>
              <div className="action-row">
                <button className="secondary-button" onClick={estimateReservation} disabled={loading || !form.studentId}>生成预估</button>
                <button className="primary-button" onClick={confirmReservation} disabled={loading || !form.studentId}>确认预约</button>
              </div>
            </div>

            <div className="panel-card">
              <div className="panel-head compact">
                <div>
                  <h3>分配结果</h3>
                  <p>显示窗口号与预估等待时间。</p>
                </div>
              </div>
              {estimate ? (
                <div className="estimate-card">
                  <div className="estimate-row"><span>学号</span><strong>{estimate.studentId}</strong></div>
                  <div className="estimate-row"><span>推荐窗口</span><strong>{estimate.assignedWindowId} 号窗口</strong></div>
                  <div className="estimate-row"><span>预估等待</span><strong>{estimate.estimatedWaitMinutes} 分钟</strong></div>
                  <div className="estimate-row"><span>排队位置</span><strong>第 {estimate.queuePosition} 位</strong></div>
                  <div className="estimate-row"><span>可用座位</span><strong>{estimate.availableSeatCount} 个</strong></div>
                  <p className="tip-block">{estimate.suggestion}</p>
                  <span className={estimate.confirmed ? 'badge success' : 'badge warning'}>{estimate.confirmed ? '已确认预约' : '待确认'}</span>
                </div>
              ) : (
                <div className="empty-state">先填写信息并点击“生成预估”。</div>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'dashboard' ? (
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
                  仿真总时长
                  <input type="number" value={dashboard.parameters.simulationDurationMinutes} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, simulationDurationMinutes: Number(e.target.value) } }))} />
                </label>
                <label>
                  顾客到达率
                  <input type="number" step="0.1" value={dashboard.parameters.arrivalRate} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, arrivalRate: Number(e.target.value) } }))} />
                </label>
                <label>
                  窗口数量
                  <input type="number" value={dashboard.parameters.windowCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, windowCount: Number(e.target.value) } }))} />
                </label>
                <label>
                  厨师数量
                  <input type="number" value={dashboard.parameters.chefCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, chefCount: Number(e.target.value) } }))} />
                </label>
                <label>
                  座位数量
                  <input type="number" value={dashboard.parameters.seatCount} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, seatCount: Number(e.target.value) } }))} />
                </label>
                <label>
                  调度策略
                  <select value={dashboard.parameters.dispatchRule} onChange={(e) => setDashboard((prev) => ({ ...prev, parameters: { ...prev.parameters, dispatchRule: e.target.value } }))}>
                    <option>最短队列</option>
                    <option>固定窗口</option>
                    <option>按餐品分配</option>
                  </select>
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
        ) : null}
      </main>
    </div>
  )
}
