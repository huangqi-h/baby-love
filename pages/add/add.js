const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

const TYPES = ['measure', 'diary', 'milestone', 'vaccine']

const MEASURE_META = { label: '身高体重', icon: '📏', color: '#4dabf7', unit: '' }

const COMMON_VACCINES = [
  '卡介苗',
  '乙肝疫苗(第1剂)',
  '乙肝疫苗(第2剂)',
  '乙肝疫苗(第3剂)',
  '脊灰疫苗(第1剂)',
  '脊灰疫苗(第2剂)',
  '脊灰疫苗(第3剂)',
  '脊灰疫苗(第4剂)',
  '百白破疫苗(第1剂)',
  '百白破疫苗(第2剂)',
  '百白破疫苗(第3剂)',
  '百白破疫苗(第4剂)',
  '麻腮风疫苗(第1剂)',
  '麻腮风疫苗(第2剂)',
  '乙脑疫苗(第1剂)',
  '乙脑疫苗(第2剂)',
  'A群流脑疫苗(第1剂)',
  'A群流脑疫苗(第2剂)',
  'A+C群流脑疫苗(第1剂)',
  'A+C群流脑疫苗(第2剂)',
  '甲肝疫苗',
  '白破疫苗',
  '五联疫苗',
  '十三价肺炎疫苗',
  '五价轮状疫苗',
  '手足口疫苗',
  '水痘疫苗',
  '流感疫苗',
  '其他'
]

Page({
  data: {
    types: TYPES.map(t => {
      if (t === 'measure') return { key: t, ...MEASURE_META }
      const m = util.typeMeta(t)
      return { key: t, label: m.label, icon: m.icon, color: m.color, unit: m.unit }
    }),
    activeType: 'measure',
    date: '',
    value: '',
    note: '',
    unit: 'cm',
    today: '',
    photos: [],
    heightValue: '',
    weightValue: '',
    editId: '',
    isEdit: false,
    vaccineOptions: COMMON_VACCINES,
    vaccineIndex: -1,
    vaccineCustom: false
  },

  onLoad(options) {
    const today = util.formatDate(new Date())
    this.setData({ date: today, today })

    // 编辑模式
    if (options.id && options.type) {
      const babyId = store.getCurrentId()
      const r = store.getRecordById(babyId, options.id)
      if (r) {
        const meta = util.typeMeta(r.type)
        const isMeasure = r.type === 'measure' || r.type === 'height' || r.type === 'weight'
        const patch = {
          activeType: r.type,
          date: util.formatDate(r.date),
          editId: r.id,
          isEdit: true,
          photos: r.photos || []
        }
        if (r.type === 'measure' && r.value && typeof r.value === 'object') {
          patch.heightValue = r.value.height ? String(r.value.height) : ''
          patch.weightValue = r.value.weight ? String(r.value.weight) : ''
        } else if (isMeasure) {
          patch.value = String(r.value)
          patch.unit = meta.unit
          if (r.type === 'height') patch.heightValue = String(r.value)
          if (r.type === 'weight') patch.weightValue = String(r.value)
        } else if (r.type === 'vaccine') {
          patch.value = r.value || ''
          patch.note = r.note || ''
          const idx = COMMON_VACCINES.indexOf(r.value)
          patch.vaccineIndex = idx >= 0 ? idx : COMMON_VACCINES.length - 1
          patch.vaccineCustom = idx < 0
        } else {
          patch.note = r.note || ''
        }
        this.setData(patch)
        wx.setNavigationBarTitle({ title: '编辑' + meta.label })
      }
    }
  },

  onTypeTap(e) {
    const t = e.currentTarget.dataset.type
    if (t === 'measure') {
      this.setData({ activeType: t, unit: '' })
      return
    }
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

  onHeightInput(e) {
    this.setData({ heightValue: e.detail.value })
  },

  onWeightInput(e) {
    this.setData({ weightValue: e.detail.value })
  },

  onVaccineChange(e) {
    const idx = parseInt(e.detail.value)
    const name = this.data.vaccineOptions[idx]
    const isCustom = name === '其他'
    this.setData({
      vaccineIndex: idx,
      vaccineCustom: isCustom,
      value: isCustom ? '' : name
    })
  },

  onSave() {
    if (this._saving) return
    this._saving = true
    const babyId = store.getCurrentId()
    if (!babyId) {
      this._saving = false
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    const { activeType, date, value, note, heightValue, weightValue, isEdit, editId } = this.data
    const isMeasure = activeType === 'measure' || activeType === 'height' || activeType === 'weight'

    if (isMeasure) {
      const h = parseFloat(heightValue)
      const w = parseFloat(weightValue)
      if ((!h || h <= 0) && (!w || w <= 0)) {
        this._saving = false
        wx.showToast({ title: '请至少输入身高或体重', icon: 'none' })
        return
      }

      if (isEdit) {
        store.updateRecord(babyId, editId, {
          date: date + 'T00:00:00',
          value: { height: h || null, weight: w || null },
          photos: this.data.photos
        })
        this.syncAndBack('已更新')
        return
      }

      // 新增：身高和体重合并为一条记录
      const record = {
        id: util.genId(),
        type: 'measure',
        date: date + 'T00:00:00',
        value: { height: h || null, weight: w || null },
        note: '',
        photos: this.data.photos,
        createdAt: Date.now()
      }
      store.addRecord(babyId, record)
      this.syncAndBack('已记录')
    } else if (activeType === 'vaccine') {
      const v = value.trim()
      if (!v) {
        this._saving = false
        wx.showToast({ title: '请输入疫苗名称', icon: 'none' })
        return
      }
      if (isEdit) {
        store.updateRecord(babyId, editId, {
          date: date + 'T00:00:00',
          value: v,
          note: note.trim(),
          photos: this.data.photos
        })
        this.syncAndBack('已更新')
        return
      }
      const record = {
        id: util.genId(),
        type: 'vaccine',
        date: date + 'T00:00:00',
        value: v,
        note: note.trim(),
        photos: this.data.photos,
        createdAt: Date.now()
      }
      store.addRecord(babyId, record)
      this.syncAndBack('已记录')
    } else {
      // 日记/里程碑
      if (!note.trim()) {
        this._saving = false
        wx.showToast({ title: '请输入内容', icon: 'none' })
        return
      }
      if (isEdit) {
        store.updateRecord(babyId, editId, {
          date: date + 'T00:00:00',
          note: note.trim(),
          photos: this.data.photos
        })
        this.syncAndBack('已更新')
        return
      }
      const record = {
        id: util.genId(),
        type: activeType,
        date: date + 'T00:00:00',
        value: '',
        note: note.trim(),
        photos: this.data.photos,
        createdAt: Date.now()
      }
      store.addRecord(babyId, record)
      this.syncAndBack('已记录')
    }
  },

  syncAndBack(title) {
    const doSync = () => {
      if (cloud.CLOUD_ENABLED) {
        return cloud.syncAll()
      }
      return Promise.resolve()
    }
    doSync().catch(() => {}).then(() => {
      this._saving = false
      wx.showToast({ title, icon: 'success' })
      setTimeout(() => wx.navigateBack(), 400)
    })
  },

  onChoosePhoto() {
    if (this.data.photos.length >= 9) return
    wx.chooseMedia({
      count: 9 - this.data.photos.length,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: (res) => {
        const temps = res.tempFiles.map(f => f.tempFilePath)
        if (cloud.CLOUD_ENABLED) {
          wx.showLoading({ title: '上传中…' })
          Promise.all(temps.map(t => cloud.uploadFile(t, 'records')))
            .then(fileIDs => {
              wx.hideLoading()
              this.setData({ photos: this.data.photos.concat(fileIDs) })
            })
            .catch(() => {
              wx.hideLoading()
              wx.showToast({ title: '上传失败', icon: 'none' })
            })
        } else {
          Promise.all(temps.map(t => util.savePhoto(t)))
            .then(paths => {
              this.setData({ photos: this.data.photos.concat(paths) })
            })
            .catch(() => {
              wx.showToast({ title: '图片保存失败', icon: 'none' })
            })
        }
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
