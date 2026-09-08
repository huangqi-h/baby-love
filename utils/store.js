const PROFILE_KEY = 'babyProfile'
const RECORDS_KEY = 'babyRecords'

function getProfile() {
  return wx.getStorageSync(PROFILE_KEY) || null
}

function saveProfile(profile) {
  wx.setStorageSync(PROFILE_KEY, profile)
}

function getRecords() {
  return wx.getStorageSync(RECORDS_KEY) || []
}

function saveRecords(records) {
  wx.setStorageSync(RECORDS_KEY, records)
}

function addRecord(record) {
  const records = getRecords()
  records.unshift(record)
  saveRecords(records)
  return records
}

function deleteRecord(id) {
  let records = getRecords()
  records = records.filter(r => r.id !== id)
  saveRecords(records)
  return records
}

function getRecordById(id) {
  return getRecords().find(r => r.id === id) || null
}

module.exports = {
  getProfile,
  saveProfile,
  getRecords,
  saveRecords,
  addRecord,
  deleteRecord,
  getRecordById
}
