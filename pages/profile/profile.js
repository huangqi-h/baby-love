const store = require('../../utils/store.js')
const util = require('../../utils/util.js')

const AVATARS = ['👶', '🐱', '🐰', '🐻', '🐼', '🌸', '⭐', '🍑']
const MAX_BIRTHDAY = util.formatDate(new Date())

Page({
  data: {
    name: '',
    gender: 'boy',
    birthday: '',
    avatar: '👶',
    avatars: AVATARS,
    maxBirthday: MAX_BIRTHDAY,
    isEdit: false
  },

  onShow() {
    const baby = store.getProfile()
    if (baby) {
      this.setData({
        name: baby.name,
        gender: baby.gender,
        birthday: baby.birthday,
        avatar: baby.avatar,
        isEdit: true
      })
    }
  },

  onNameInput(e) {
    this.setData({ name: e.detail.value })
  },

  onGenderChange(e) {
    this.setData({ gender: e.detail.value })
  },

  onBirthdayChange(e) {
    this.setData({ birthday: e.detail.value })
  },

  onAvatarTap(e) {
    this.setData({ avatar: e.currentTarget.dataset.avatar })
  },

  onSave() {
    const { name, gender, birthday, avatar } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请填写宝宝名字', icon: 'none' })
      return
    }
    if (!birthday) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }
    const profile = { name: name.trim(), gender, birthday, avatar }
    store.saveProfile(profile)
    getApp().globalData.baby = profile
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.switchTab({ url: '/pages/index/index' }), 600)
  }
})
