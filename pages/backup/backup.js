const store = require('../../utils/store.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    cloudEnabled: cloud.CLOUD_ENABLED,
    status: ''
  },
  onExport() {
    const data = store.exportAll()
    wx.setClipboardData({
      data: JSON.stringify(data),
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
    })
  },
  onImport() {
    wx.getClipboardData({
      success: (res) => {
        try {
          const data = JSON.parse(res.data)
          if (store.importAll(data)) {
            this.setData({ status: `已导入 ${data.babies.length} 个宝宝的数据` })
            wx.showToast({ title: '导入成功', icon: 'success' })
          } else {
            wx.showToast({ title: '数据格式不正确', icon: 'none' })
          }
        } catch (e) {
          wx.showToast({ title: '解析失败，请检查剪贴板', icon: 'none' })
        }
      }
    })
  },
  onCloudUpload() {
    if (!cloud.CLOUD_ENABLED) {
      wx.showToast({ title: '未开启云同步', icon: 'none' })
      return
    }
    const data = store.exportAll()
    cloud.upload(data)
      .then(() => wx.showToast({ title: '云备份成功', icon: 'success' }))
      .catch(() => wx.showToast({ title: '云备份失败', icon: 'none' }))
  },
  onCloudDownload() {
    if (!cloud.CLOUD_ENABLED) {
      wx.showToast({ title: '未开启云同步', icon: 'none' })
      return
    }
    cloud.download()
      .then(payload => {
        if (payload && store.importAll(payload)) {
          this.setData({ status: '已从云端恢复' })
          wx.showToast({ title: '恢复成功', icon: 'success' })
        } else {
          wx.showToast({ title: '云端暂无数据', icon: 'none' })
        }
      })
      .catch(() => wx.showToast({ title: '恢复失败', icon: 'none' }))
  }
})
