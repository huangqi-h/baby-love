const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const who = require('../../utils/who.js')

Page({
  data: {
    h: { empty: false, emptyText: '', latest: '', whoLatest: '' },
    w: { empty: false, emptyText: '', latest: '', whoLatest: '' }
  },

  onReady() {
    this.inited = true
    const draw = () => this.draw()
    if (typeof wx.nextTick === 'function') {
      wx.nextTick(draw)
    } else {
      setTimeout(draw, 50)
    }
  },

  onShow() {
    if (this.inited) this.draw(true)
  },

  draw(retry = false) {
    this.drawOne('height', 'chartHeight', retry)
    this.drawOne('weight', 'chartWeight', retry)
  },

  drawOne(mode, canvasId, retry = false) {
    const query = wx.createSelectorQuery()
    query.select('#' + canvasId)
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res || !res[0] || !res[0].node) {
          if (retry) setTimeout(() => this.drawOne(mode, canvasId, false), 200)
          return
        }
        const w = res[0].width
        const h = res[0].height
        if (w <= 0 || h <= 0) {
          if (retry) setTimeout(() => this.drawOne(mode, canvasId, false), 200)
          return
        }
        const canvas = res[0].node
        const dpr = (wx.getSystemInfoSync().pixelRatio) || 2
        canvas.width = w * dpr
        canvas.height = h * dpr
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)
        const state = this.render(ctx, mode, w, h)
        const key = mode === 'height' ? 'h' : 'w'
        const update = {}
        update[key] = state
        this.setData(update)
      })
  },

  render(ctx, mode, w, h) {
    ctx.clearRect(0, 0, w, h)
    const baby = store.getCurrentBaby()
    const meta = util.typeMeta(mode)
    const records = store.getCurrentId()
      ? store.getRecords(store.getCurrentId())
      : []
    const userRecords = records
      .filter(r => r.type === mode && r.value)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    if (!baby) {
      return { empty: true, emptyText: '请先在首页添加宝宝', latest: '', whoLatest: '' }
    }
    if (userRecords.length === 0) {
      return { empty: true, emptyText: `暂无${meta.label}数据`, latest: '', whoLatest: '' }
    }

    const userPoints = userRecords.map(r => ({
      month: util.monthsFromBirth(baby.birthday, r.date),
      val: Number(r.value)
    }))

    const band = who.whoBand(baby.gender, mode)
    let maxX = Math.max(1, ...userPoints.map(p => p.month))
    if (!isFinite(maxX)) maxX = 1
    const bpts = band.filter(p => p.month <= maxX)

    // 坐标范围（纳入用户数据与 WHO 参考区间）
    const yVals = userPoints.map(p => p.val)
      .concat(bpts.map(p => p.p3), bpts.map(p => p.p97))
    let maxY = yVals.length ? Math.max(...yVals) * 1.1 : 10
    let minY = yVals.length ? Math.min(...yVals) : 0
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
    let latest = `宝宝（${last.month.toFixed(1)}个月）：${last.val}${meta.unit}`
    let whoLatest = ''
    if (bpts.length) {
      const whoLast = bpts.reduce((a, p) => (p.month <= last.month ? p : a), bpts[0])
      whoLatest = `WHO中位（${whoLast.month}个月）：${whoLast.p50}${meta.unit}`
    }
    return {
      empty: false,
      emptyText: '',
      latest,
      whoLatest
    }
  }
})
