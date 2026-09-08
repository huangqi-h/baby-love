const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const who = require('../../utils/who.js')

Page({
  data: {
    mode: 'height',
    empty: false,
    latest: '',
    whoLatest: ''
  },

  onReady() {
    this.inited = true
    this.draw()
  },

  onShow() {
    if (this.inited) this.draw()
  },

  onMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.mode) return
    this.setData({ mode }, () => this.draw())
  },

  draw() {
    const query = wx.createSelectorQuery()
    query.select('#chartCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) return
        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const dpr = (wx.getSystemInfoSync().pixelRatio) || 2
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        ctx.scale(dpr, dpr)
        this.render(ctx, res[0].width, res[0].height)
      })
  },

  render(ctx, w, h) {
    ctx.clearRect(0, 0, w, h)
    const baby = store.getCurrentBaby()
    const mode = this.data.mode
    const meta = util.typeMeta(mode)
    const records = store.getCurrentId()
      ? store.getRecords(store.getCurrentId())
      : []
    const userRecords = records
      .filter(r => r.type === mode && r.value)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    if (!baby) {
      this.setData({ empty: true, latest: '', whoLatest: '' })
      ctx.fillStyle = '#bbb'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('请先在首页添加宝宝', w / 2, h / 2)
      return
    }
    if (userRecords.length === 0) {
      this.setData({ empty: true, latest: '', whoLatest: '' })
      ctx.fillStyle = '#bbb'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`暂无${meta.label}数据`, w / 2, h / 2)
      return
    }
    this.setData({ empty: false })

    const userPoints = userRecords.map(r => ({
      month: util.monthsFromBirth(baby.birthday, r.date),
      val: Number(r.value)
    }))

    const band = who.whoBand(baby.gender, mode)
    const maxX = Math.max(1, ...userPoints.map(p => p.month))
    const bpts = band.filter(p => p.month <= maxX)

    // 坐标范围（纳入用户数据与 WHO 参考区间）
    const yVals = userPoints.map(p => p.val)
      .concat(bpts.map(p => p.p3), bpts.map(p => p.p97))
    let maxY = Math.max(...yVals) * 1.1
    let minY = Math.min(...yVals)
    if (minY > 0) minY = Math.max(0, minY * 0.9)
    else minY = 0

    const padL = 46, padR = 18, padT = 22, padB = 38
    const plotW = w - padL - padR
    const plotH = h - padT - padB
    const sx = m => padL + (m / maxX) * plotW
    const sy = v => padT + plotH - ((v - minY) / (maxY - minY || 1)) * plotH

    // 网格 + Y轴标签
    ctx.strokeStyle = '#f0f0f0'
    ctx.fillStyle = '#aaa'
    ctx.font = '11px sans-serif'
    ctx.lineWidth = 1
    const ySteps = 4
    ctx.textAlign = 'right'
    for (let i = 0; i <= ySteps; i++) {
      const v = minY + (maxY - minY) * (i / ySteps)
      const y = sy(v)
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(w - padR, y)
      ctx.stroke()
      ctx.fillText(v.toFixed(1), padL - 6, y + 4)
    }

    // X轴标签（月龄）
    ctx.textAlign = 'center'
    const xSteps = Math.min(5, Math.ceil(maxX))
    for (let i = 0; i <= xSteps; i++) {
      const m = (maxX / xSteps) * i
      ctx.fillText(m.toFixed(0) + '月', sx(m), h - padB + 18)
    }

    if (bpts.length >= 2) {
      // P3–P97 参考区间（阴影）
      ctx.fillStyle = 'rgba(120, 120, 120, 0.10)'
      ctx.beginPath()
      bpts.forEach((p, i) => {
        const x = sx(p.month), y = sy(p.p97)
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      for (let i = bpts.length - 1; i >= 0; i--) {
        const p = bpts[i]
        ctx.lineTo(sx(p.month), sy(p.p3))
      }
      ctx.closePath()
      ctx.fill()

      // P15 / P85 浅线
      ctx.strokeStyle = 'rgba(150, 150, 150, 0.45)'
      ctx.lineWidth = 1
      ;['p15', 'p85'].forEach(key => {
        ctx.beginPath()
        bpts.forEach((p, i) => {
          const x = sx(p.month), y = sy(p[key])
          i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
        })
        ctx.stroke()
      })

      // P50 中位线（虚线）
      ctx.setLineDash([5, 4])
      ctx.strokeStyle = '#999'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      bpts.forEach((p, i) => {
        const x = sx(p.month), y = sy(p.p50)
        i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
      })
      ctx.stroke()
      ctx.setLineDash([])
    }

    // 用户数据折线
    ctx.strokeStyle = meta.color
    ctx.lineWidth = 2.5
    ctx.beginPath()
    userPoints.forEach((p, i) => {
      const x = sx(p.month), y = sy(p.val)
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)
    })
    ctx.stroke()

    // 数据点
    userPoints.forEach(p => {
      const x = sx(p.month), y = sy(p.val)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = meta.color
      ctx.lineWidth = 2.5
      ctx.stroke()
    })

    const last = userPoints[userPoints.length - 1]
    const whoLast = bpts.reduce((a, p) => (p.month <= last.month ? p : a), bpts[0])
    this.setData({
      latest: `宝宝（${last.month.toFixed(1)}个月）：${last.val}${meta.unit}`,
      whoLatest: `WHO中位（${whoLast.month}个月）：${whoLast.p50}${meta.unit}`
    })
  }
})
