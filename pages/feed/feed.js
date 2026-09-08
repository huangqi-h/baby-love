const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

const TYPES = [
  { key: 'breast', label: '母乳' },
  { key: 'formula', label: '配方奶' },
  { key: 'pump', label: '挤奶' }
]

Page({
  data: {
    feeds: [],
    types: TYPES,
    activeType: 'breast',
    amount: '',
    duration: '',
    lastText: '',
    nextText: ''
  },
  onShow() {
    cloud.autoSync().then(() => this.refresh())
  },
  onTypeTap(e) {
    this.setData({ activeType: e.currentTarget.dataset.type })
  },
  onAmountInput(e) {
    this.setData({ amount: e.detail.value })
  },
  onDurationInput(e) {
    this.setData({ duration: e.detail.value })
  },
  fmt(d) {
    const y = d.getFullYear()
    const m = ('0' + (d.getMonth() + 1)).slice(-2)
    const day = ('0' + d.getDate()).slice(-2)
    const hh = ('0' + d.getHours()).slice(-2)
    const mm = ('0' + d.getMinutes()).slice(-2)
    return `${y}-${m}-${day} ${hh}:${mm}`
  },
  onSave() {
    const babyId = store.getCurrentId()
    if (!babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    const { activeType, amount, duration } = this.data
    const t = TYPES.find(x => x.key === activeType)
    const feed = {
      id: util.genId(),
      type: activeType,
      typeLabel: t.label,
      time: Date.now(),
      amount: activeType !== 'breast' ? (Number(amount) || 0) : 0,
      duration: activeType === 'breast' ? (Number(duration) || 0) : 0
    }
    store.addFeed(babyId, feed)
    if (store.getShareId() && cloud.CLOUD_ENABLED) {
      cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
    }
    this.setData({ amount: '', duration: '' })
    this.refresh()
  },
  onDelete(e) {
    const id = e.currentTarget.dataset.id
    store.deleteFeed(store.getCurrentId(), id)
    if (store.getShareId() && cloud.CLOUD_ENABLED) {
      cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
    }
    this.refresh()
  },
  refresh() {
    const babyId = store.getCurrentId()
    if (!babyId) {
      this.setData({ feeds: [], lastText: '', nextText: '' })
      return
    }
    const feeds = store.getFeeds(babyId)
    const list = feeds.map(f => {
      const d = new Date(f.time)
      const desc = f.type === 'breast'
        ? `${f.typeLabel} ${f.duration} 分钟`
        : `${f.typeLabel} ${f.amount} ml`
      return Object.assign({}, f, { timeText: this.fmt(d), descText: desc })
    })
    let lastText = '', nextText = ''
    if (feeds.length) {
      const last = new Date(feeds[0].time)
      lastText = this.fmt(last)
      const next = new Date(last.getTime() + 3 * 3600 * 1000)
      nextText = this.fmt(next)
    }
    this.setData({ feeds: list, lastText, nextText })
  }
})
