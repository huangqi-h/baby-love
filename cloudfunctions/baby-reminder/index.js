const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 定时触发器（每日 09:00）：对「已订阅」用户，下发最近一条临近/逾期疫苗提醒
// 部署：右键本目录「上传并部署」；需开启订阅消息接口权限
// 前置：微信公众平台申请「疫苗/健康提醒」类目订阅消息模板，并替换下方 TEMPLATE_ID
const TEMPLATE_ID = 'Y-olTYsFEc4c7vr6n9dSSDJsOtu-vdsmdVW1trXDEAg'

// 疫苗日程（age：出生后月数），与前端 SCHEDULE 保持一致
const SCHEDULE = [
  { age: 0, name: '卡介苗、乙肝疫苗(第1剂)' },
  { age: 1, name: '乙肝疫苗(第2剂)' },
  { age: 2, name: '脊灰疫苗(第1剂)' },
  { age: 3, name: '脊灰(第2剂)、百白破(第1剂)' },
  { age: 4, name: '脊灰(第3剂)、百白破(第2剂)' },
  { age: 5, name: '百白破(第3剂)' },
  { age: 6, name: '乙肝(第3剂)、A群流脑(第1剂)' },
  { age: 8, name: '麻腮风(第1剂)、乙脑(第1剂)' },
  { age: 9, name: 'A群流脑(第2剂)' },
  { age: 18, name: '百白破(第4剂)、麻腮风(第2剂)、甲肝' },
  { age: 24, name: '乙脑(第2剂)' },
  { age: 36, name: 'A+C群流脑(第1剂)' },
  { age: 48, name: '脊灰(第4剂)' },
  { age: 72, name: '白破、A+C群流脑(第2剂)' }
]

exports.main = async () => {
  if (!TEMPLATE_ID) return { ok: false, msg: '未配置 TEMPLATE_ID' }

  // 1) 取出所有已订阅该模板的用户
  const subs = await db.collection('baby_subscribe')
    .where({ templateId: TEMPLATE_ID })
    .limit(1000)
    .get()

  const today = new Date()
  let pushed = 0
  let skipped = 0

  for (const sub of subs.data) {
    const openid = sub._openid
    if (!openid) { skipped++; continue }

    // 2) 取该用户最近一次云备份（含宝宝与疫苗完成情况）
    const backup = await db.collection('baby_backup')
      .where({ _openid: openid })
      .limit(1)
      .get()
    const payload = backup.data[0] && backup.data[0].payload
    if (!payload || !payload.babies || !payload.babies.length) { skipped++; continue }

    const babies = payload.babies
    const vacDone = payload.vaccines || {}
    let best = null // 选最早到期的一条

    for (const baby of babies) {
      const done = vacDone[baby.id] || []
      SCHEDULE.forEach((item, idx) => {
        if (done.indexOf(String(idx)) >= 0) return
        const due = new Date(baby.birthday)
        due.setMonth(due.getMonth() + item.age)
        const diff = Math.round((today - due) / 86400000)
        if (diff > 30 || diff < -14) return // 逾期>30天或还没到临近窗口则跳过
        const candidate = {
          baby, item, idx, due, diff,
          rank: diff < 0 ? (1000 - diff) : diff // 越临近/逾期越优先
        }
        if (!best || candidate.rank < best.rank) best = candidate
      })
    }

    if (!best) { skipped++; continue }

    // 3) 下发订阅消息
    try {
      await cloud.openapi.subscribeMessage.send({
        touser: openid,
        templateId: TEMPLATE_ID,
        page: 'pages/vaccine/vaccine',
        data: {
          thing6: { value: `${best.baby.name}的疫苗接种提醒` },
          thing1: { value: best.item.name },
          time7: { value: best.due.toISOString().slice(0, 10) },
          number3: { value: best.diff > 0 ? 0 : -best.diff }
        }
      })
      pushed++
      await db.collection('baby_subscribe').doc(sub._id).update({
        data: { lastPushAt: Date.now() }
      })
    } catch (e) {
      // 用户未授权/模板不符/一次性订阅已用尽时抛错，忽略
      skipped++
    }
  }

  return { ok: true, pushed, skipped }
}
