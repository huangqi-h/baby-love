const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 云函数：宝宝数据备份
// 在微信开发者工具开通云开发后，右键本目录「上传并部署」
exports.main = async (event) => {
  const { action, payload } = event
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  const col = db.collection('baby_backup')

  if (action === 'upload') {
    const exist = await col.where({ _openid: openid }).get()
    if (exist.data.length) {
      await col.doc(exist.data[0]._id).update({ data: { payload, updatedAt: Date.now() } })
    } else {
      await col.add({ data: { _openid: openid, payload, updatedAt: Date.now() } })
    }
    return { ok: true }
  }

  if (action === 'download') {
    const res = await col.where({ _openid: openid }).limit(1).get()
    return { ok: true, payload: res.data[0] ? res.data[0].payload : null }
  }

  return { ok: false }
}
