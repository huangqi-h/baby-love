const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

Page({
  data: {
    record: null
  },

  onLoad(options) {
    this.babyId = store.getCurrentId()
    if (options.id) {
      this.loadRecord(options.id)
    }
  },

  loadRecord(id) {
    const r = store.getRecordById(this.babyId, id)
    if (!r) {
      wx.showToast({ title: '记录不存在', icon: 'none' })
      return
    }
    const meta = util.typeMeta(r.type)
    const display = Object.assign({}, r, {
      typeLabel: meta.label,
      typeIcon: meta.icon,
      typeColor: meta.color,
      dateText: util.formatDate(r.date),
      measureText: (r.type === 'height' || r.type === 'weight') ? `${r.value} ${meta.unit}` : '',
      photos: r.photos || []
    })
    this.setData({ record: display })
    wx.setNavigationBarTitle({ title: meta.label })
  },

  onDelete() {
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条记录吗？',
      confirmColor: '#ff6b81',
      success: (res) => {
        if (res.confirm) {
          store.deleteRecord(this.babyId, this.data.record.id)
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        }
      }
    })
  }
})
