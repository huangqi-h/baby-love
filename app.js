App({
  globalData: {
    baby: null
  },
  onLaunch() {
    const baby = wx.getStorageSync('babyProfile')
    if (baby) {
      this.globalData.baby = baby
    }
  }
})
