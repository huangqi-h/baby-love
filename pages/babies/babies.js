const store = require('../../utils/store.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    babies: [],
    currentId: ''
  },
  onShow() {
    cloud.autoSync().then(() => {
      const list = store.getBabies().map(b => Object.assign({}, b, {
        isImgAvatar: b.avatar && (b.avatar.startsWith('wxfile://') || b.avatar.startsWith('http') || b.avatar.startsWith('cloud://') || b.avatar.startsWith('/'))
      }))
      this.setData({
        babies: list,
        currentId: store.getCurrentId()
      })
    })
  },
  switchTo(e) {
    const id = e.currentTarget.dataset.id
    store.setCurrentId(id)
    getApp().globalData.currentBabyId = id
    getApp().globalData.baby = store.getBabyById(id)
    this.setData({ currentId: id })
    wx.showToast({ title: '已切换', icon: 'success' })
  },
  addBaby() {
    wx.navigateTo({
      url: '/pages/baby-form/baby-form',
      fail: (err) => wx.showToast({ title: '打开失败:' + (err.errMsg || ''), icon: 'none' })
    })
  },
  editBaby(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/pages/baby-form/baby-form?id=' + id,
      fail: (err) => wx.showToast({ title: '打开失败:' + (err.errMsg || ''), icon: 'none' })
    })
  },
  deleteBaby(e) {
    if (this._deleting) return
    this._deleting = true
    const id = e.currentTarget.dataset.id
    const baby = store.getBabyById(id)
    wx.showModal({
      title: '删除宝宝',
      content: `确定删除「${baby.name}」及其全部数据吗？`,
      confirmColor: '#ff6b81',
      success: (res) => {
        this._deleting = false
        if (res.confirm) {
          store.deleteBaby(id)
          this.setData({ babies: store.getBabies(), currentId: store.getCurrentId() })
          if (cloud.CLOUD_ENABLED) {
            cloud.syncAll().catch(() => {})
          }
        }
      },
      fail: () => { this._deleting = false }
    })
  }
})
