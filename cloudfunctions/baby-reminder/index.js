const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 定时触发器：每日检查各用户宝宝到期/逾期疫苗并下发订阅消息
// 部署：右键本目录「上传并部署」；在 cloudfunctions/baby-reminder/config.json 配置定时器
// 前置：需在公众平台申请「疫苗/健康提醒」类目订阅消息模板，并替换下方 TEMPLATE_ID
const TEMPLATE_ID = 'Y-olTYsFEc4c7vr6n9dSSDJsOtu-vdsmdVW1trXDEAg'

exports.main = async () => {
  if (!TEMPLATE_ID) {
    return { ok: false, msg: '未配置 TEMPLATE_ID' }
  }
  const backups = await db.collection('baby_backup').limit(1000).get()
  const today = new Date()
  let pushed = 0

  for (const doc of backups.data) {
    const payload = doc.payload || {}
    const babies = payload.babies || []
    const recordsAll = payload.records || {}
    const vacDone = payload.vaccines || {}
    const openid = doc._openid
    if (!openid) continue

    for (const baby of babies) {
      const done = vacDone[baby.id] || []
      const schedule = [
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
      schedule.forEach((item, idx) => {
        if (done.indexOf(String(idx)) >= 0) return
        const due = new Date(baby.birthday)
        due.setMonth(due.getMonth() + item.age)
        const diff = Math.round((today - due) / 86400000)
        // 临近(7天内)或已逾期(30天内)才提醒
        if (diff >= -7 && diff <= 30) {
          try {
            cloud.openapi.subscribeMessage.send({
              touser: openid,
              templateId: TEMPLATE_ID,
              page: 'pages/vaccine/vaccine',
              data: {
                thing6: { value: `${baby.name}的疫苗接种提醒` },
                thing1: { value: item.name },
                time7: { value: due.toISOString().slice(0, 10) },
                number3: { value: diff > 0 ? 0 : -diff }
              }
            })
            pushed++
          } catch (e) {
            // 用户未授权订阅时 openapi 会抛错，忽略
          }
        }
      })
    }
  }
  return { ok: true, pushed }
}
