const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const COL = db.collection('baby_subscribe')

// 记录/取消用户的订阅消息授权（按 openid + 模板ID 隔离）
// 部署：右键本目录「上传并部署」
exports.main = async (event) => {
  const { TEMPLATE_ID, action } = event
  const openid = cloud.getWXContext().OPENID
  if (!openid || !TEMPLATE_ID) return { ok: false, msg: 'missing' }

  if (action === 'unsubscribe') {
    await COL.where({ _openid: openid, templateId: TEMPLATE_ID }).remove()
    return { ok: true }
  }

  // subscribe：保留该用户对每个模板的最新授权时间
  const exist = await COL.where({ _openid: openid, templateId: TEMPLATE_ID }).get()
  const data = { templateId: TEMPLATE_ID, updatedAt: Date.now(), lastPushAt: 0 }
  if (exist.data.length) {
    await COL.doc(exist.data[0]._id).update({ data })
  } else {
    await COL.add({ data: Object.assign({ _openid: openid }, data) })
  }
  return { ok: true }
}
