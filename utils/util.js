function formatDate(date) {
  const d = date ? new Date(date) : new Date()
  const y = d.getFullYear()
  const m = ('0' + (d.getMonth() + 1)).slice(-2)
  const day = ('0' + d.getDate()).slice(-2)
  return `${y}-${m}-${day}`
}

// 计算宝宝年龄，返回 "x岁y个月" 或 "y个月"
function calcAge(birthday) {
  if (!birthday) return ''
  const b = new Date(birthday)
  const now = new Date()
  let months = (now.getFullYear() - b.getFullYear()) * 12 + (now.getMonth() - b.getMonth())
  if (now.getDate() < b.getDate()) months--
  if (months < 0) months = 0
  const y = Math.floor(months / 12)
  const m = months % 12
  if (y <= 0) return `${m}个月`
  if (m === 0) return `${y}岁`
  return `${y}岁${m}个月`
}

// 计算从出生到指定日期的月龄（用于曲线横坐标）
function monthsFromBirth(birthday, date) {
  if (!birthday) return 0
  const b = new Date(birthday)
  const d = date ? new Date(date) : new Date()
  let months = (d.getFullYear() - b.getFullYear()) * 12 + (d.getMonth() - b.getMonth())
  const dayDiff = d.getDate() - b.getDate()
  months += dayDiff / 30
  return Math.max(0, Math.round(months * 10) / 10)
}

function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6)
}

const TYPE_META = {
  height: { label: '身高', unit: 'cm', icon: '📏', color: '#4dabf7' },
  weight: { label: '体重', unit: 'kg', icon: '⚖️', color: '#ffa94d' },
  diary: { label: '日记', unit: '', icon: '📝', color: '#9775fa' },
  milestone: { label: '里程碑', unit: '', icon: '🌟', color: '#ff6b81' }
}

function typeMeta(type) {
  return TYPE_META[type] || TYPE_META.diary
}

function savePhoto(tempPath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const ext = (tempPath.match(/\.(\w+)$/) || [, 'jpg'])[1] || 'jpg'
    const savePath = `${wx.env.USER_DATA_PATH}/photo_${genId()}.${ext}`
    fs.saveFile({
      tempFilePath: tempPath,
      filePath: savePath,
      success: () => resolve(savePath),
      fail: (err) => reject(err)
    })
  })
}

module.exports = {
  formatDate,
  calcAge,
  monthsFromBirth,
  genId,
  typeMeta,
  TYPE_META,
  savePhoto
}
