const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

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
    let measureText = ''
    if (r.type === 'measure' && r.value && typeof r.value === 'object') {
      const parts = []
      if (r.value.height) parts.push(`身高 ${r.value.height} cm`)
      if (r.value.weight) parts.push(`体重 ${r.value.weight} kg`)
      measureText = parts.join('\n')
    } else if (r.type === 'height' || r.type === 'weight') {
      measureText = `${r.value} ${meta.unit}`
    }
    const display = Object.assign({}, r, {
      typeLabel: meta.label,
      typeIcon: meta.icon,
      typeColor: meta.color,
      dateText: util.formatDate(r.date),
      measureText,
      measureLines: measureText ? measureText.split('\n') : [],
      vaccineName: r.type === 'vaccine' ? (r.value || '') : '',
      isMeasure: r.type === 'measure' || r.type === 'height' || r.type === 'weight',
      photos: r.photos || []
    })
    this.setData({ record: display })
    wx.setNavigationBarTitle({ title: meta.label })
  },

  previewPhoto(e) {
    const idx = e.currentTarget.dataset.index
    const rawUrls = this.data.record.photos || []
    const hasCloud = rawUrls.some(u => u.startsWith('cloud://'))
    if (hasCloud && cloud.CLOUD_ENABLED) {
      wx.cloud.getTempFileURL({
        fileList: rawUrls,
        success: res => {
          const urls = res.fileList.map(f => f.tempFileURL)
          wx.previewImage({ current: urls[idx], urls })
        },
        fail: () => wx.showToast({ title: '预览失败', icon: 'none' })
      })
    } else {
      wx.previewImage({ current: rawUrls[idx], urls: rawUrls })
    }
  },

  onDelete() {
    if (this._deleting) return
    this._deleting = true
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条记录吗？',
      confirmColor: '#ff6b81',
      success: (res) => {
        this._deleting = false
        if (res.confirm) {
          store.deleteRecord(this.babyId, this.data.record.id)
          if (store.getShareId() && cloud.CLOUD_ENABLED) {
            cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
          }
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack(), 500)
        }
      },
      fail: () => { this._deleting = false }
    })
  }
})
