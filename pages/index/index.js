const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

Page({
  data: {
    baby: null,
    ageText: '',
    records: [],
    empty: true,
    babies: [],
    showSwitcher: false
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
      babies: store.getBabies()
    })
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

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
