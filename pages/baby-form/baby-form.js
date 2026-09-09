const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

const AVATARS = ['👶', '🐱', '🐰', '🐻', '🐼', '🌸', '⭐', '🍑']
const MAX_BIRTHDAY = util.formatDate(new Date())

Page({
  data: {
    editId: '',
    name: '',
    gender: 'boy',
    birthday: '',
    avatar: '👶',
    isCustomAvatar: false,
    avatars: AVATARS,
    maxBirthday: MAX_BIRTHDAY,
    isEdit: false
  },
  onLoad(options) {
    if (options.id) {
      const b = store.getBabyById(options.id)
      if (b) {
        const isImg = b.avatar && (b.avatar.startsWith('wxfile://') || b.avatar.startsWith('http') || b.avatar.startsWith('/'))
        this.setData({
          editId: b.id,
          name: b.name,
          gender: b.gender,
          birthday: b.birthday,
          avatar: b.avatar,
          isCustomAvatar: isImg,
          isEdit: true
        })
      }
    }
  },
  onNameInput(e) { this.setData({ name: e.detail.value }) },
  onGenderChange(e) { this.setData({ gender: e.detail.value }) },
  onBirthdayChange(e) { this.setData({ birthday: e.detail.value }) },
  onAvatarTap(e) { this.setData({ avatar: e.currentTarget.dataset.avatar, isCustomAvatar: false }) },
  onChooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        util.savePhoto(tempPath)
          .then(path => this.setData({ avatar: path, isCustomAvatar: true }))
          .catch(() => wx.showToast({ title: '保存失败', icon: 'none' }))
      }
    })
  },
  onSave() {
    const { name, gender, birthday, avatar, editId } = this.data
    if (!name.trim()) {
      wx.showToast({ title: '请填写宝宝名字', icon: 'none' })
      return
    }
    if (!birthday) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }
    const data = { name: name.trim(), gender, birthday, avatar }
    if (editId) {
      store.updateBaby(editId, data)
    } else {
      store.addBaby(data)
    }
    if (store.getShareId() && cloud.CLOUD_ENABLED) {
      cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
    }
    wx.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  }
})
