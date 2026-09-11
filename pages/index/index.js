const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

// 简化版国家免疫规划疫苗接种时间表（age：出生后月数）
const VACCINE_SCHEDULE = [
  { age: 0, name: '卡介苗、乙肝疫苗(第1剂)' },
  { age: 1, name: '乙肝疫苗(第2剂)' },
  { age: 2, name: '脊灰疫苗(第1剂)' },
  { age: 3, name: '脊灰(第2剂)、百白破(第1剂)' },
  { age: 4, name: '脊灰(第3剂)、百白破(第2剂)' },
  { age: 5, name: '百白破(第3剂)' },
  { age: 6, name: '乙肝(第3剂)、A群流脑(第1剂)' },
  { age: 8, name: '麻腮风(第1剂)、乙脑(第1剂)' },
  { age: 9, name: 'A群流脑(第2剂)' },
  { age: 18, name: '百白破(第4剂)、麻腮风(第2剂)、甲肝' },
  { age: 24, name: '乙脑(第2剂)' },
  { age: 36, name: 'A+C群流脑(第1剂)' },
  { age: 48, name: '脊灰(第4剂)' },
  { age: 72, name: '白破、A+C群流脑(第2剂)' }
]

Page({
  data: {
    baby: null,
    ageText: '',
    records: [],
    empty: true,
    babies: [],
    showSwitcher: false,
    upcomingVaccines: [],
    upcomingTodos: [],
    pageSize: 10,
    hasMore: false
  },

  onShow() {
    cloud.autoSync().then(() => this.refresh())
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  },

  refresh() {
    let baby = store.getCurrentBaby()
    if (baby) {
      baby = Object.assign({}, baby, {
        isImgAvatar: baby.avatar && (baby.avatar.startsWith('wxfile://') || baby.avatar.startsWith('http') || baby.avatar.startsWith('cloud://') || baby.avatar.startsWith('/'))
      })
    }
    const babyId = store.getCurrentId()
    const all = babyId ? store.getRecords(babyId) : []
    const pageSize = this.data.pageSize
    const list = this.buildList(all, pageSize)
    this.setData({
      baby,
      ageText: baby ? util.calcAge(baby.birthday) : '',
      records: list,
      empty: all.length === 0,
      hasMore: all.length > pageSize,
      babies: (store.getBabies() || []).map(b => Object.assign({}, b, {
        isImgAvatar: b.avatar && (b.avatar.startsWith('wxfile://') || b.avatar.startsWith('http') || b.avatar.startsWith('cloud://') || b.avatar.startsWith('/'))
      })),
      upcomingVaccines: this.computeVaccines(),
      upcomingTodos: this.computeTodos()
    })
  },

  buildList(all, limit) {
    return all.slice(0, limit).map(r => {
      const meta = util.typeMeta(r.type)
      let summary = ''
      if (r.type === 'measure' && r.value && typeof r.value === 'object') {
        const parts = []
        if (r.value.height) parts.push(`身高 ${r.value.height}cm`)
        if (r.value.weight) parts.push(`体重 ${r.value.weight}kg`)
        summary = parts.join(' / ')
      } else if (r.type === 'height' || r.type === 'weight') {
        summary = `${r.value}${meta.unit}`
      } else if (r.type === 'vaccine') {
        summary = r.value || meta.label
      } else {
        summary = r.note || meta.label
      }
      const hasPhoto = !!(r.photos && r.photos.length)
      return Object.assign({}, r, {
        dateText: util.formatDate(r.date),
        typeLabel: meta.label,
        typeIcon: meta.icon,
        typeColor: meta.color,
        summary,
        hasPhoto,
        firstPhoto: hasPhoto ? r.photos[0] : ''
      })
    })
  },

  loadMore() {
    const babyId = store.getCurrentId()
    const all = babyId ? store.getRecords(babyId) : []
    const pageSize = this.data.records.length + this.data.pageSize
    const list = this.buildList(all, pageSize)
    this.setData({
      records: list,
      hasMore: all.length > pageSize
    })
  },

  computeVaccines() {
    const baby = store.getCurrentBaby()
    if (!baby) return []
    const done = store.getVaccines(baby.id)
    const today = new Date()
    return VACCINE_SCHEDULE.map((item, idx) => {
      const due = new Date(baby.birthday)
      due.setMonth(due.getMonth() + item.age)
      const diff = Math.round((today - due) / 86400000)
      if (done.indexOf(String(idx)) >= 0) return null
      if (diff > 14) return null
      const status = diff > 0 ? 'overdue' : 'soon'
      return {
        id: String(idx),
        name: item.name,
        status,
        dueText: util.formatDate(due),
        diffText: diff > 0 ? `逾期${diff}天` : `还有${-diff}天`
      }
    }).filter(Boolean)
  },

  computeTodos() {
    const babyId = store.getCurrentId()
    if (!babyId) return []
    return store.getTodos(babyId)
      .filter(t => !t.done)
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3)
      .map(t => Object.assign({}, t, {
        notePreview: t.note ? (t.note.length > 16 ? t.note.slice(0, 16) + '…' : t.note) : ''
      }))
  },

  noop() {},

  toggleSwitcher() {
    if (!this.data.baby) {
      wx.navigateTo({ url: '/pages/babies/babies' })
      return
    }
    this.setData({ showSwitcher: !this.data.showSwitcher })
  },

  switchBaby(e) {
    const id = e.currentTarget.dataset.id
    store.setCurrentId(id)
    getApp().globalData.currentBabyId = id
    getApp().globalData.baby = store.getBabyById(id)
    this.setData({ showSwitcher: false })
    this.refresh()
  },

  goAdd() {
    if (!store.getCurrentId()) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/pages/add/add' })
  },

  goBabies() {
    wx.navigateTo({ url: '/pages/babies/babies' })
  },

  goAddBaby() {
    this.setData({ showSwitcher: false })
    wx.navigateTo({
      url: '/pages/baby-form/baby-form',
      fail: (err) => wx.showToast({ title: '打开失败:' + (err.errMsg || ''), icon: 'none' })
    })
  },

  goVaccine() {
    wx.navigateTo({ url: '/pages/vaccine/vaccine' })
  },

  goChart() {
    wx.switchTab({ url: '/pages/chart/chart' })
  },

  goAlbum() {
    wx.navigateTo({ url: '/pages/album/album' })
  },

  goTodo() {
    wx.navigateTo({ url: '/pages/todo/todo' })
  },

  toggleTodo(e) {
    if (this._toggling) return
    this._toggling = true
    const id = e.currentTarget.dataset.id
    const babyId = store.getCurrentId()
    const item = store.getTodos(babyId).find(t => t.id === id)
    if (item) {
      store.updateTodo(babyId, id, { done: !item.done })
      if (store.getShareId() && cloud.CLOUD_ENABLED) {
        cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
      }
    }
    this._toggling = false
    this.setData({ upcomingTodos: this.computeTodos() })
  },

  markVaccine(e) {
    if (this._marking) return
    this._marking = true
    const id = e.currentTarget.dataset.id
    const baby = store.getCurrentBaby()
    if (!baby || store.getVaccines(baby.id).indexOf(id) >= 0) {
      this._marking = false
      return
    }
    store.toggleVaccine(baby.id, id)
    this.setData({ upcomingVaccines: this.computeVaccines() })
    if (store.getShareId() && cloud.CLOUD_ENABLED) {
      cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {}).then(() => { this._marking = false })
    } else if (cloud.CLOUD_ENABLED) {
      cloud.upload(store.exportAll()).catch(() => {}).then(() => { this._marking = false })
    } else {
      this._marking = false
    }
    wx.showToast({ title: '已标记完成', icon: 'success' })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
