const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

const TYPES = ['height', 'weight', 'diary', 'milestone']

Page({
  data: {
    types: TYPES.map(t => {
      const m = util.typeMeta(t)
      return { key: t, label: m.label, icon: m.icon, color: m.color, unit: m.unit }
    }),
    activeType: 'height',
    date: '',
    value: '',
    note: '',
    unit: 'cm',
    today: '',
    photos: []
  },

  onLoad() {
    const today = util.formatDate(new Date())
    this.setData({ date: today, today })
  },

  onTypeTap(e) {
    const t = e.currentTarget.dataset.type
    const meta = util.typeMeta(t)
    this.setData({
      activeType: t,
      unit: meta.unit
    })
  },

  onDateChange(e) {
    this.setData({ date: e.detail.value })
  },

  onValueInput(e) {
    this.setData({ value: e.detail.value })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  onSave() {
    const { activeType, date, value, note } = this.data
    const isMeasure = activeType === 'height' || activeType === 'weight'

    if (isMeasure) {
      const v = parseFloat(value)
      if (!v || v <= 0) {
        wx.showToast({ title: '请输入有效数值', icon: 'none' })
        return
      }
    } else {
      if (!note.trim()) {
        wx.showToast({ title: '请输入内容', icon: 'none' })
        return
      }
    }

    const record = {
      id: util.genId(),
      type: activeType,
      date: date + 'T00:00:00',
      value: isMeasure ? parseFloat(value) : '',
      note: isMeasure ? '' : note.trim(),
      photos: this.data.photos,
      createdAt: Date.now()
    }
    store.addRecord(record)
    wx.showToast({ title: '已记录', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  },

  onChoosePhoto() {
    if (this.data.photos.length >= 9) return
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const temps = res.tempFiles.map(f => f.tempFilePath)
        Promise.all(temps.map(t => util.savePhoto(t)))
          .then(paths => {
            this.setData({ photos: this.data.photos.concat(paths) })
          })
          .catch(() => {
            wx.showToast({ title: '图片保存失败', icon: 'none' })
          })
      }
    })
  },

  onRemovePhoto(e) {
    const idx = e.currentTarget.dataset.index
    const photos = this.data.photos.slice()
    photos.splice(idx, 1)
    this.setData({ photos })
  }
})
