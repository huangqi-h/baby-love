const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const who = require('../../utils/who.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    tab: 'height',
    h: { empty: false, emptyText: '', latest: '', whoLatest: '' },
    w: { empty: false, emptyText: '', latest: '', whoLatest: '' },
    list: [],
    emptyList: false
  },

  onReady() {
    this.inited = true
    const draw = () => this.refresh()
    if (typeof wx.nextTick === 'function') {
      wx.nextTick(draw)
    } else {
      setTimeout(draw, 50)
    }
  },

  onShow() {
    if (this.inited) this.refresh(true)
  },

  refresh(retry = false) {
    const tab = this.data.tab
    if (tab === 'list') {
      this.loadList()
    } else {
      this.drawOne(tab, tab === 'height' ? 'chartHeight' : 'chartWeight', retry)
    }
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    if (tab === this.data.tab) return
    this.setData({ tab }, () => {
      this.refresh()
    })
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
    if (!baby) {
      return { empty: true, emptyText: '请先在首页添加宝宝', latest: '', whoLatest: '' }
    }

    // 兼容 measure 类型（value 为对象）以及旧数据 height/weight（value 为数字）
    const userRecords = records
      .map(r => {
        if (r.type === 'measure' && r.value && typeof r.value === 'object') {
          const v = r.value[mode]
          return v ? { date: r.date, val: Number(v) } : null
        }
        if (r.type === mode && r.value) {
          return { date: r.date, val: Number(r.value) }
        }
        return null
      })
      .filter(Boolean)
      .sort((a, b) => new Date(a.date) - new Date(b.date))

    const hasData = userRecords.length > 0

    // 计算月龄范围：有数据按数据最大月龄，无数据按宝宝当前月龄（至少1个月，最多60个月）
    let maxX
    if (hasData) {
      maxX = Math.max(1, ...userRecords.map(r => util.monthsFromBirth(baby.birthday, r.date)))
    } else {
      maxX = Math.max(1, Math.min(60, util.monthsFromBirth(baby.birthday, util.formatDate(new Date()))))
    }
    if (!isFinite(maxX)) maxX = 12

    const userPoints = userRecords.map(r => ({
      month: util.monthsFromBirth(baby.birthday, r.date),
      val: r.val
    }))

    const band = who.whoBand(baby.gender, mode)
    const bpts = band.filter(p => p.month <= maxX)

    // 坐标范围
    let yVals = bpts.map(p => p.p3).concat(bpts.map(p => p.p97))
    if (hasData) {
      yVals = yVals.concat(userPoints.map(p => p.val))
    }
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
      ctx.fillStyle = 'rgba(255, 154, 158, 0.18)'
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

    let latest = ''
    let whoLatest = ''

    if (hasData) {
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
      latest = `宝宝（${last.month.toFixed(1)}个月）：${last.val}${meta.unit}`
      if (bpts.length) {
        const whoLast = bpts.reduce((a, p) => (p.month <= last.month ? p : a), bpts[0])
        whoLatest = `WHO中位（${whoLast.month}个月）：${whoLast.p50}${meta.unit}`
      }
    }

    return {
      empty: false,
      emptyText: hasData ? '' : `暂无${meta.label}数据，图中为 WHO 标准参考`,
      latest,
      whoLatest
    }
  },

  loadList() {
    const babyId = store.getCurrentId()
    const all = babyId ? store.getRecords(babyId) : []

    // 过滤身高/体重相关记录，measure 不拆分
    const filtered = all.filter(r => {
      if (r.type === 'measure' && r.value && typeof r.value === 'object') {
        return r.value.height || r.value.weight
      }
      return (r.type === 'height' || r.type === 'weight') && r.value
    })
    filtered.sort((a, b) => new Date(b.date) - new Date(a.date))

    const groups = []
    const map = {}
    filtered.forEach(r => {
      const dateKey = util.formatDate(r.date)
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey, items: [] }
        groups.push(map[dateKey])
      }
      const meta = util.typeMeta(r.type)
      let summary = ''
      if (r.type === 'measure' && r.value && typeof r.value === 'object') {
        const parts = []
        if (r.value.height) parts.push(`身高 ${r.value.height}cm`)
        if (r.value.weight) parts.push(`体重 ${r.value.weight}kg`)
        summary = parts.join(' / ')
      } else if (r.type === 'height' || r.type === 'weight') {
        summary = `${r.value} ${meta.unit}`
      }
      map[dateKey].items.push(Object.assign({}, r, {
        typeLabel: meta.label,
        typeIcon: meta.icon,
        typeColor: meta.color,
        summary,
        dateText: dateKey,
        editType: r.type
      }))
    })

    this.setData({
      list: groups,
      emptyList: groups.length === 0
    })
  },

  goEdit(e) {
    const { id, type } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/add/add?id=${id}&type=${type}` })
  },

  onDelete(e) {
    if (this._deleting) return
    this._deleting = true
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条记录吗？',
      confirmColor: '#ff6b81',
      success: (res) => {
        this._deleting = false
        if (res.confirm) {
          const babyId = store.getCurrentId()
          store.deleteRecord(babyId, id)
          if (cloud.CLOUD_ENABLED) {
            cloud.syncAll().catch(() => {})
          }
          this.loadList()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      },
      fail: () => { this._deleting = false }
    })
  }
})
