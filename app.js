const store = require('./utils/store.js')
const util = require('./utils/util.js')

App({
  globalData: {
    currentBabyId: '',
    baby: null
  },
  onLaunch() {
    // 兼容旧版单宝宝数据
    const oldProfile = wx.getStorageSync('babyProfile')
    if (oldProfile && store.getBabies().length === 0) {
      const baby = Object.assign({ id: util.genId() }, oldProfile)
      store.addBaby(baby)
      const oldRecords = wx.getStorageSync('babyRecords') || []
      if (oldRecords.length) store.saveRecords(baby.id, oldRecords)
      wx.removeStorageSync('babyProfile')
      wx.removeStorageSync('babyRecords')
    }
    const baby = store.getCurrentBaby()
    if (baby) {
      this.globalData.currentBabyId = baby.id
      this.globalData.baby = baby
    }
  }
})
