const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

Page({
  data: {
    baby: null,
    ageText: '',
    babyCount: 0
  },
  onShow() {
    const baby = store.getCurrentBaby()
    this.setData({
      baby,
      ageText: baby ? util.calcAge(baby.birthday) : '',
      babyCount: store.getBabies().length
    })
  },
  goBabies() { wx.navigateTo({ url: '/pages/babies/babies' }) },
  goVaccine() { wx.navigateTo({ url: '/pages/vaccine/vaccine' }) },
  goFeed() { wx.navigateTo({ url: '/pages/feed/feed' }) },
  goBackup() { wx.navigateTo({ url: '/pages/backup/backup' }) }
})
