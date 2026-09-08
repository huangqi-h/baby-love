const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

Page({
  data: {
    baby: null,
    ageText: '',
    records: [],
    empty: true
  },

  onShow() {
    this.refresh()
  },

  onPullDownRefresh() {
    this.refresh()
    wx.stopPullDownRefresh()
  },

  refresh() {
    const baby = store.getProfile()
    const records = store.getRecords()
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
      empty: records.length === 0
    })
  },

  goAdd() {
    wx.navigateTo({ url: '/pages/add/add' })
  },

  goProfile() {
    wx.switchTab({ url: '/pages/profile/profile' })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
