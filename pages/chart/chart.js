const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

Page({
  data: {
    mode: 'height',
    empty: false,
    latest: ''
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
    const baby = store.getProfile()
    const mode = this.data.mode
    const meta = util.typeMeta(mode)
    const records = store.getRecords()
      .filter(r => r.type === mode && r.value)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    if (!baby || records.length === 0) {
      this.setData({ empty: true, latest: '' })
      ctx.fillStyle = '#bbb'
      ctx.font = '14px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(`暂无${meta.label}数据`, w / 2, h / 2)
      return
    }
    this.setData({ empty: false })

    const points = records.map(r => ({
      month: util.monthsFromBirth(baby.birthday, r.date),
      val: Number(r.value)
    }))

    let maxX = Math.max(1, ...points.map(p => p.month))
    let maxY = Math.max(...points.map(p => p.val))
    let minY = Math.min(...points.map(p => p.val))
    maxY = maxY * 1.15
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
      const x = sx(m)
      ctx.fillText(m.toFixed(0) + '月', x, h - padB + 18)
    }

    // 折线
    ctx.strokeStyle = meta.color
    ctx.lineWidth = 2.5
    ctx.beginPath()
    points.forEach((p, i) => {
      const x = sx(p.month), y = sy(p.val)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 数据点
    points.forEach(p => {
      const x = sx(p.month), y = sy(p.val)
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x, y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = meta.color
      ctx.lineWidth = 2.5
      ctx.stroke()
    })

    const last = points[points.length - 1]
    this.setData({ latest: `最新（${last.month.toFixed(1)}个月）：${last.val}${meta.unit}` })
  }
})
