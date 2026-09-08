// 云同步封装：需在微信开发者工具中「开通云开发」并填入环境 ID 后启用
const CLOUD_ENV = ''        // TODO: 填入你的云开发环境 ID
const CLOUD_ENABLED = false // 开通并配置后改为 true

let cloudInited = false

function ensureCloud() {
  if (!CLOUD_ENABLED || !CLOUD_ENV) return false
  if (!wx.cloud) {
    wx.showToast({ title: '当前基础库不支持云开发', icon: 'none' })
    return false
  }
  if (!cloudInited) {
    wx.cloud.init({ env: CLOUD_ENV, traceUser: true })
    cloudInited = true
  }
  return true
}

// 上传全量数据到云数据库（集合：baby_backup，按 openid 隔离）
function upload(payload) {
  if (!ensureCloud()) return Promise.reject(new Error('cloud disabled'))
  const db = wx.cloud.database()
  const _ = db.command
  return db.collection('baby_backup').where({ _openid: _.exists(true) })
    .get()
    .then(res => {
      const col = db.collection('baby_backup')
      if (res.data && res.data.length) {
        return col.doc(res.data[0]._id).set({ data: { payload, updatedAt: Date.now() } })
      }
      return col.add({ data: { payload, updatedAt: Date.now() } })
    })
}

function download() {
  if (!ensureCloud()) return Promise.reject(new Error('cloud disabled'))
  const db = wx.cloud.database()
  return db.collection('baby_backup').limit(1).get()
    .then(res => (res.data && res.data[0] && res.data[0].payload) || null)
}

// 上报订阅消息授权关系到云函数（定时任务据此下发）
function subscribe(templateId) {
  if (!ensureCloud()) return Promise.reject(new Error('cloud disabled'))
  return wx.cloud.callFunction({
    name: 'baby-subscribe',
    data: { TEMPLATE_ID: templateId, action: 'subscribe' }
  })
}

/* ---------- 家庭共享 ---------- */
function createShare(payload) {
  if (!ensureCloud()) return Promise.reject(new Error('cloud disabled'))
  return wx.cloud.callFunction({ name: 'baby-share', data: { action: 'create', data: payload } })
    .then(res => res.result)
}

function joinShare(shareId) {
  if (!ensureCloud()) return Promise.reject(new Error('cloud disabled'))
  return wx.cloud.callFunction({ name: 'baby-share', data: { action: 'join', shareId } })
    .then(res => res.result)
}

function syncShare(shareId, payload) {
  if (!ensureCloud()) return Promise.reject(new Error('cloud disabled'))
  return wx.cloud.callFunction({ name: 'baby-share', data: { action: 'sync', shareId, data: payload } })
    .then(res => res.result)
}

// 自动同步：有 shareId 时拉取云端最新数据并 import（建议在页面 onShow 调用）
function autoSync() {
  const store = require('./store.js')
  const shareId = store.getShareId()
  if (!shareId || !ensureCloud()) return Promise.resolve(false)
  return syncShare(shareId)
    .then(res => {
      if (res && res.success && res.payload) {
        store.importAll(res.payload)
        return true
      }
      return false
    })
    .catch(() => false)
}

module.exports = { CLOUD_ENABLED, upload, download, subscribe, createShare, joinShare, syncShare, autoSync }
