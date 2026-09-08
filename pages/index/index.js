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
    upcomingVaccines: []
  },

  onShow() {
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  },

  refresh() {
    const baby = store.getCurrentBaby()
    const babyId = store.getCurrentId()
    const records = babyId ? store.getRecords(babyId) : []
    const list = records.slice(0, 10).map(r => {
      const meta = util.typeMeta(r.type)
      let summary = ''
      if (r.type === 'height' || r.type === 'weight') {
        summary = `${r.value}${meta.unit}`
      } else {
        summary = r.note || meta.label
      }
      return Object.assign({}, r, {
        dateText: util.formatDate(r.date),
        typeLabel: meta.label,
        typeIcon: meta.icon,
        typeColor: meta.color,
        summary,
        hasPhoto: !!(r.photos && r.photos.length)
      })
    })
    this.setData({
      baby,
      ageText: baby ? util.calcAge(baby.birthday) : '',
      records: list,
      empty: records.length === 0,
      babies: store.getBabies(),
      upcomingVaccines: this.computeVaccines()
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

  markVaccine(e) {
    const id = e.currentTarget.dataset.id
    const baby = store.getCurrentBaby()
    if (!baby || store.getVaccines(baby.id).indexOf(id) >= 0) return
    store.toggleVaccine(baby.id, id)
    this.setData({ upcomingVaccines: this.computeVaccines() })
    if (cloud.CLOUD_ENABLED) {
      cloud.upload(store.exportAll()).catch(() => {})
    }
    wx.showToast({ title: '已标记完成', icon: 'success' })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
