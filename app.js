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

    // 启动时自动云恢复：解决多端（手机/电脑）本地 Storage 不互通的问题
    const cloud = require('./utils/cloud.js')
    if (cloud.CLOUD_ENABLED && store.getBabies().length === 0) {
      const shareId = store.getShareId()
      if (shareId) {
        cloud.autoSync().catch(() => {})
      } else {
        cloud.download()
          .then(payload => {
            if (payload && payload.babies && payload.babies.length) {
              store.importAll(payload)
            }
          })
          .catch(() => {})
      }
    }

    const baby = store.getCurrentBaby()
    if (baby) {
      this.globalData.currentBabyId = baby.id
      this.globalData.baby = baby
    }
  }
})
