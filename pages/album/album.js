const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

Page({
  data: {
    photos: [],
    empty: true
  },
  onShow() {
    this.loadPhotos()
  },
  loadPhotos() {
    const babyId = store.getCurrentId()
    if (!babyId) {
      this.setData({ photos: [], empty: true })
      return
    }
    const records = store.getRecords(babyId)
    const list = []
    records.forEach(r => {
      if (r.photos && r.photos.length) {
        r.photos.forEach((url, idx) => {
          list.push({
            id: `${r.id}_${idx}`,
            url,
            dateText: util.formatDate(r.date),
            typeLabel: util.typeMeta(r.type).label,
            recordId: r.id
          })
        })
      }
    })
    this.setData({ photos: list, empty: list.length === 0 })
  },
  preview(e) {
    const idx = e.currentTarget.dataset.index
    const urls = this.data.photos.map(p => p.url)
    wx.previewImage({ current: urls[idx], urls })
  },
  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  }
})
