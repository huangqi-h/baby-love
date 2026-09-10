const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    list: [],
    empty: false
  },

  onShow() {
    this.load()
  },

  load() {
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
      empty: groups.length === 0
    })
  },

  goEdit(e) {
    const { id, type } = e.currentTarget.dataset
    wx.navigateTo({ url: `/pages/add/add?id=${id}&type=${type}` })
  },

  onDelete(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条记录吗？',
      confirmColor: '#ff6b81',
      success: (res) => {
        if (res.confirm) {
          const babyId = store.getCurrentId()
          store.deleteRecord(babyId, id)
          if (store.getShareId() && cloud.CLOUD_ENABLED) {
            cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
          }
          this.load()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  }
})
