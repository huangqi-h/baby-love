const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

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
    subscribed: false
  },
  onShow() {
    this.refresh()
  },
  refresh() {
    const baby = store.getCurrentBaby()
    if (!baby) {
      this.setData({ list: [], babyName: '' })
      return
    }
    const done = store.getVaccines(baby.id)
    const today = new Date()
    const list = SCHEDULE.map((item, idx) => {
      const due = new Date(baby.birthday)
      due.setMonth(due.getMonth() + item.age)
      const diffDay = Math.round((today - due) / 86400000)
      let status = 'upcoming'
      if (diffDay > 0) status = 'overdue'
      else if (diffDay >= -14) status = 'soon'
      const isDone = done.indexOf(String(idx)) >= 0
      return Object.assign({}, item, {
        id: String(idx),
        dueText: util.formatDate(due),
        status,
        isDone,
        diffText: diffDay > 0 ? `已逾期 ${diffDay} 天` : (diffDay === 0 ? '今天到期' : `还有 ${-diffDay} 天`)
      })
    })
    this.setData({ list, babyName: baby.name })
  },
  toggle(e) {
    const id = e.currentTarget.dataset.id
    const baby = store.getCurrentBaby()
    store.toggleVaccine(baby.id, id)
    this.refresh()
  },
  onSubscribe() {
    // 需先在微信公众平台申请「疫苗/健康提醒」类目订阅消息模板，将模板 ID 填到下方
    const TEMPLATE_ID = 'Y-olTYsFEc4c7vr6n9dSSDJsOtu-vdsmdVW1trXDEAg'
    if (!TEMPLATE_ID) {
      wx.showToast({ title: '未配置模板ID', icon: 'none' })
      return
    }
    wx.requestSubscribeMessage({
      tmplIds: [TEMPLATE_ID],
      success: () => {
        wx.showToast({ title: '已开启到期提醒', icon: 'success' })
        this.setData({ subscribed: true })
      },
      fail: () => wx.showToast({ title: '授权失败', icon: 'none' })
    })
  }
})
