const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

function genCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase()
}

exports.main = async (event) => {
  const { action, shareId, data } = event
  const { OPENID } = cloud.getWXContext()

  if (action === 'create') {
    let code = genCode()
    let tries = 0
    while (tries < 5) {
      const exist = await db.collection('baby_share').where({ shareId: code }).limit(1).get()
      if (exist.data.length === 0) break
      code = genCode()
      tries++
    }
    await db.collection('baby_share').add({
      data: {
        shareId: code,
        owner: OPENID,
        members: [OPENID],
        payload: data || {},
        updatedAt: db.serverDate(),
        createdAt: db.serverDate()
      }
    })
    return { code }
  }

  if (action === 'join') {
    if (!shareId) return { error: '缺少邀请码' }
    const res = await db.collection('baby_share').where({ shareId: shareId.toUpperCase() }).limit(1).get()
    if (!res.data.length) return { error: '邀请码不存在' }
    const doc = res.data[0]
    if (doc.members.indexOf(OPENID) >= 0) {
      return { success: true, payload: doc.payload }
    }
    await db.collection('baby_share').doc(doc._id).update({
      data: { members: _.addToSet(OPENID), updatedAt: db.serverDate() }
    })
    return { success: true, payload: doc.payload }
  }

  if (action === 'sync') {
    if (!shareId) return { error: '缺少邀请码' }
    const res = await db.collection('baby_share').where({ shareId: shareId.toUpperCase() }).limit(1).get()
    if (!res.data.length) return { error: '邀请码不存在' }
    const doc = res.data[0]
    if (doc.members.indexOf(OPENID) < 0) return { error: '你不在该家庭内' }
    if (data) {
      await db.collection('baby_share').doc(doc._id).update({
        data: { payload: data, updatedAt: db.serverDate() }
      })
      return { success: true }
    }
    return { success: true, payload: doc.payload }
  }

  if (action === 'members') {
    if (!shareId) return { error: '缺少邀请码' }
    const res = await db.collection('baby_share').where({ shareId: shareId.toUpperCase() }).limit(1).get()
    if (!res.data.length) return { error: '邀请码不存在' }
    const doc = res.data[0]
    if (doc.members.indexOf(OPENID) < 0) return { error: '你不在该家庭内' }
    return {
      success: true,
      members: doc.members,
      count: doc.members.length,
      isOwner: doc.owner === OPENID
    }
  }

  return { error: '未知 action' }
}
