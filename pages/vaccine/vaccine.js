const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

// 简化版国家免疫规划疫苗接种时间表（age：出生后月数）
const SCHEDULE = [
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
    list: [],
    babyName: '',
    subscribed: false,
    customVaccines: [],
    showPicker: false,
    pickerDate: '',
    pickerId: '',
    pickerName: '',
    today: ''
  },
  onShow() {
    const today = util.formatDate(new Date())
    this.setData({ pickerDate: today, today })
    cloud.autoSync().then(() => this.refresh())
  },
  refresh() {
    const baby = store.getCurrentBaby()
    if (!baby) {
      this.setData({ list: [], babyName: '', customVaccines: [] })
      return
    }
    const done = store.getVaccines(baby.id)
    const today = new Date()

    // 先获取自定义疫苗记录，用于查找实际接种日期
    const records = store.getRecords(baby.id) || []
    const customVaccines = records
      .filter(r => r.type === 'vaccine')
      .map(r => Object.assign({}, r, {
        dateText: util.formatDate(r.date),
        name: r.value || '疫苗'
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date))

    const list = SCHEDULE.map((item, idx) => {
      const due = new Date(baby.birthday)
      due.setMonth(due.getMonth() + item.age)
      const diffDay = Math.round((today - due) / 86400000)
      let status = 'upcoming'
      if (diffDay > 0) status = 'overdue'
      else if (diffDay >= -14) status = 'soon'
      const isDone = done.indexOf(String(idx)) >= 0

      // 查找该计划疫苗的最新实际接种记录
      const matched = customVaccines.filter(r => r.name === item.name)
      const latestRecord = matched.length ? matched[0] : null

      return Object.assign({}, item, {
        id: String(idx),
        dueText: isDone && latestRecord ? `${latestRecord.dateText} 已接种` : util.formatDate(due),
        status: isDone ? 'done' : status,
        isDone,
        diffText: isDone ? '' : (diffDay > 0 ? `已逾期 ${diffDay} 天` : (diffDay === 0 ? '今天到期' : `还有 ${-diffDay} 天`))
      })
    })

    this.setData({ list, babyName: baby.name, customVaccines })
  },
  onTapItem(e) {
    const id = e.currentTarget.dataset.id
    const item = this.data.list.find(i => i.id === id)
    if (!item) return
    if (item.isDone) {
      // 已完成 → 取消完成
      this.toggleDone(id)
      return
    }
    // 未完成 → 弹出日期选择
    this.setData({
      showPicker: true,
      pickerId: id,
      pickerName: item.name,
      pickerDate: util.formatDate(new Date())
    })
  },
  onPickerChange(e) {
    this.setData({ pickerDate: e.detail.value })
  },
  onPickerCancel() {
    this.setData({ showPicker: false, pickerId: '', pickerName: '' })
  },
  onPickerConfirm() {
    if (this._saving) return
    this._saving = true
    const { pickerId, pickerName, pickerDate } = this.data
    const baby = store.getCurrentBaby()
    const babyId = baby ? baby.id : ''

    // 1. 标记计划完成
    store.toggleVaccine(babyId, pickerId)

    // 2. 添加疫苗记录
    const record = {
      id: util.genId(),
      type: 'vaccine',
      date: pickerDate + 'T00:00:00',
      value: pickerName,
      note: '',
      photos: [],
      createdAt: Date.now()
    }
    store.addRecord(babyId, record)

    // 3. 同步
    if (store.getShareId() && cloud.CLOUD_ENABLED) {
      cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
    } else if (cloud.CLOUD_ENABLED) {
      cloud.upload(store.exportAll()).catch(() => {})
    }

    this.setData({ showPicker: false, pickerId: '', pickerName: '' })
    this._saving = false
    this.refresh()
    wx.showToast({ title: '已记录接种', icon: 'success' })
  },
  toggleDone(id) {
    if (this._toggling) return
    this._toggling = true
    const baby = store.getCurrentBaby()
    store.toggleVaccine(baby.id, id)
    this.refresh()
    if (store.getShareId() && cloud.CLOUD_ENABLED) {
      cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {}).then(() => { this._toggling = false })
    } else if (cloud.CLOUD_ENABLED) {
      cloud.upload(store.exportAll()).catch(() => {}).then(() => { this._toggling = false })
    } else {
      this._toggling = false
    }
  },
  onSubscribe() {
    // 需先在微信公众平台申请「疫苗/健康提醒」类目订阅消息模板
    const TEMPLATE_ID = 'Y-olTYsFEc4c7vr6n9dSSDJsOtu-vdsmdVW1trXDEAg'
    if (!TEMPLATE_ID) {
      wx.showToast({ title: '未配置模板ID', icon: 'none' })
      return
    }
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: () => {
        this.setData({ subscribed: true })
        // 上报订阅关系到云端，定时任务据此对当前用户下发
        cloud.subscribe(TEMPLATE_ID)
          .then(() => wx.showToast({ title: '已开启到期提醒', icon: 'success' }))
          .catch(() => wx.showToast({ title: '已授权，云上报失败', icon: 'none' }))
      },
      fail: () => wx.showToast({ title: '授权失败', icon: 'none' })
    })
  },

  goDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` })
  },
  noop() {}
})
