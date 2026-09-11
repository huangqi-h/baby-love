const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    baby: null,
    ageText: '',
    babyCount: 0,
    shareId: '',
    memberCount: 0,
    isOwner: false
  },
  onShow() {
    let baby = store.getCurrentBaby()
    if (baby) {
      baby = Object.assign({}, baby, {
        isImgAvatar: baby.avatar && (baby.avatar.startsWith('wxfile://') || baby.avatar.startsWith('http') || baby.avatar.startsWith('cloud://') || baby.avatar.startsWith('/'))
      })
    }
    const shareId = store.getShareId()
    this.setData({
      baby,
      ageText: baby ? util.calcAge(baby.birthday) : '',
      babyCount: store.getBabies().length,
      shareId
    })
    if (shareId && cloud.CLOUD_ENABLED) {
      cloud.getMembers(shareId)
        .then(res => {
          if (res.success) {
            this.setData({ memberCount: res.count, isOwner: res.isOwner })
          }
        })
        .catch(() => {})
    }
  },
  goBabies() { wx.navigateTo({ url: '/pages/babies/babies' }) },
  goVaccine() { wx.navigateTo({ url: '/pages/vaccine/vaccine' }) },
  goFeed() { wx.navigateTo({ url: '/pages/feed/feed' }) },
  goTodo() { wx.navigateTo({ url: '/pages/todo/todo' }) },
  goBackup() { wx.navigateTo({ url: '/pages/backup/backup' }) },

  createShare() {
    if (this._sharing) return
    this._sharing = true
    if (!cloud.CLOUD_ENABLED) {
      this._sharing = false
      wx.showToast({ title: '请先开通云开发', icon: 'none' })
      return
    }
    wx.showLoading({ title: '创建中…' })
    cloud.createShare(store.exportAll())
      .then(res => {
        wx.hideLoading()
        this._sharing = false
        if (res.error) {
          wx.showToast({ title: res.error, icon: 'none' })
          return
        }
        store.setShareId(res.code)
        this.setData({ shareId: res.code })
        wx.showModal({
          title: '家庭共享已开启',
          content: `邀请码：${res.code}\n请家人在「我的」页点击「加入家庭」输入此码。`,
          showCancel: false
        })
      })
      .catch(err => {
        wx.hideLoading()
        this._sharing = false
        wx.showToast({ title: err.message || '创建失败', icon: 'none' })
      })
  },

  showJoinInput() {
    wx.showModal({
      title: '加入家庭',
      editable: true,
      placeholderText: '请输入邀请码',
      success: (res) => {
        if (res.confirm && res.content) this.doJoin(res.content.trim())
      }
    })
  },

  doJoin(code) {
    if (this._joining) return
    this._joining = true
    if (!cloud.CLOUD_ENABLED) {
      this._joining = false
      wx.showToast({ title: '请先开通云开发', icon: 'none' })
      return
    }
    wx.showLoading({ title: '加入中…' })
    cloud.joinShare(code)
      .then(res => {
        wx.hideLoading()
        this._joining = false
        if (res.error) {
          wx.showToast({ title: res.error, icon: 'none' })
          return
        }
        if (res.payload) store.importAll(res.payload)
        store.setShareId(code.toUpperCase())
        this.setData({ shareId: code.toUpperCase() })
        wx.showToast({ title: '加入成功', icon: 'success' })
        this.onShow()
      })
      .catch(err => {
        wx.hideLoading()
        this._joining = false
        wx.showToast({ title: err.message || '加入失败', icon: 'none' })
      })
  },

  syncNow() {
    if (this._syncing) return
    this._syncing = true
    const shareId = store.getShareId()
    if (!shareId) {
      this._syncing = false
      return
    }
    if (!cloud.CLOUD_ENABLED) {
      this._syncing = false
      wx.showToast({ title: '请先开通云开发', icon: 'none' })
      return
    }
    wx.showLoading({ title: '同步中…' })
    cloud.syncAll()
      .then(() => {
        wx.hideLoading()
        this._syncing = false
        wx.showToast({ title: '同步成功', icon: 'success' })
      })
      .catch(err => {
        wx.hideLoading()
        this._syncing = false
        wx.showToast({ title: err.message || '同步失败', icon: 'none' })
      })
  },

  exitShare() {
    wx.showModal({
      title: '退出家庭共享',
      content: '退出后不再自动同步家人数据，确定吗？',
      success: (res) => {
        if (res.confirm) {
          store.clearShareId()
          this.setData({ shareId: '' })
          wx.showToast({ title: '已退出', icon: 'success' })
        }
      }
    })
  }
})
