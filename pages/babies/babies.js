const store = require('../../utils/store.js')

Page({
  data: {
    babies: [],
    currentId: ''
  },
  onShow() {
    this.setData({
      babies: store.getBabies(),
      currentId: store.getCurrentId()
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
    const id = e.currentTarget.dataset.id
    const baby = store.getBabyById(id)
    wx.showModal({
      title: '删除宝宝',
      content: `确定删除「${baby.name}」及其全部数据吗？`,
      confirmColor: '#ff6b81',
      success: (res) => {
        if (res.confirm) {
          store.deleteBaby(id)
          this.setData({ babies: store.getBabies(), currentId: store.getCurrentId() })
        }
      }
    })
  }
})
