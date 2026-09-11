const util = require('./util.js')

const BABIES_KEY = 'babies'
const CURRENT_KEY = 'currentBabyId'
const RECORDS_KEY = 'records'
const VACCINE_KEY = 'vaccines'
const FEED_KEY = 'feeds'
const TODO_KEY = 'todos'
const SHARE_KEY = 'shareId'

/* ---------- 宝宝 ---------- */
function getBabies() { return wx.getStorageSync(BABIES_KEY) || [] }
function saveBabies(list) { wx.setStorageSync(BABIES_KEY, list) }
function getCurrentId() { return wx.getStorageSync(CURRENT_KEY) || '' }
function setCurrentId(id) { wx.setStorageSync(CURRENT_KEY, id) }
function getBabyById(id) { return getBabies().find(b => b.id === id) || null }
function getCurrentBaby() { return getBabyById(getCurrentId()) }

function addBaby(baby) {
  const list = getBabies()
  const b = Object.assign({ id: util.genId(), avatar: '👶', gender: 'boy' }, baby)
  list.push(b)
  saveBabies(list)
  if (!getCurrentId()) setCurrentId(b.id)
  return b
}

function updateBaby(id, patch) {
  saveBabies(getBabies().map(b => b.id === id ? Object.assign({}, b, patch) : b))
}

function deleteBaby(id) {
  const list = getBabies().filter(b => b.id !== id)
  saveBabies(list)
  const rec = wx.getStorageSync(RECORDS_KEY) || {}
  delete rec[id]
  wx.setStorageSync(RECORDS_KEY, rec)
  const vac = wx.getStorageSync(VACCINE_KEY) || {}
  delete vac[id]
  wx.setStorageSync(VACCINE_KEY, vac)
  const feed = wx.getStorageSync(FEED_KEY) || {}
  delete feed[id]
  wx.setStorageSync(FEED_KEY, feed)
  const todo = wx.getStorageSync(TODO_KEY) || {}
  delete todo[id]
  wx.setStorageSync(TODO_KEY, todo)
  if (getCurrentId() === id) setCurrentId(list[0] ? list[0].id : '')
  return list
}

/* ---------- 成长记录 ---------- */
function getRecords(babyId) {
  const all = wx.getStorageSync(RECORDS_KEY) || {}
  return all[babyId] || []
}

function saveRecords(babyId, records) {
  const all = wx.getStorageSync(RECORDS_KEY) || {}
  all[babyId] = records
  wx.setStorageSync(RECORDS_KEY, all)
}

function addRecord(babyId, record) {
  const records = getRecords(babyId)
  records.unshift(record)
  saveRecords(babyId, records)
  return records
}

function deleteRecord(babyId, id) {
  const records = getRecords(babyId).filter(r => r.id !== id)
  saveRecords(babyId, records)
  return records
}

function getRecordById(babyId, id) {
  return getRecords(babyId).find(r => r.id === id) || null
}

function updateRecord(babyId, id, patch) {
  const records = getRecords(babyId).map(r => r.id === id ? Object.assign({}, r, patch) : r)
  saveRecords(babyId, records)
  return records
}

/* ---------- 疫苗 ---------- */
function getVaccines(babyId) {
  const all = wx.getStorageSync(VACCINE_KEY) || {}
  return all[babyId] || []
}

function toggleVaccine(babyId, itemId) {
  const all = wx.getStorageSync(VACCINE_KEY) || {}
  let list = all[babyId] || []
  list = list.indexOf(itemId) >= 0 ? list.filter(x => x !== itemId) : list.concat(itemId)
  all[babyId] = list
  wx.setStorageSync(VACCINE_KEY, all)
  return list
}

/* ---------- 待办 ---------- */
function getTodos(babyId) {
  const all = wx.getStorageSync(TODO_KEY) || {}
  return all[babyId] || []
}

function saveTodos(babyId, todos) {
  const all = wx.getStorageSync(TODO_KEY) || {}
  all[babyId] = todos
  wx.setStorageSync(TODO_KEY, all)
}

function addTodo(babyId, todo) {
  const todos = getTodos(babyId)
  todos.unshift(todo)
  saveTodos(babyId, todos)
  return todos
}

function deleteTodo(babyId, id) {
  const todos = getTodos(babyId).filter(t => t.id !== id)
  saveTodos(babyId, todos)
  return todos
}

function updateTodo(babyId, id, patch) {
  const todos = getTodos(babyId).map(t => t.id === id ? Object.assign({}, t, patch) : t)
  saveTodos(babyId, todos)
  return todos
}

/* ---------- 喂养 ---------- */
function getFeeds(babyId) {
  const all = wx.getStorageSync(FEED_KEY) || {}
  return all[babyId] || []
}

function saveFeeds(babyId, feeds) {
  const all = wx.getStorageSync(FEED_KEY) || {}
  all[babyId] = feeds
  wx.setStorageSync(FEED_KEY, all)
}

function addFeed(babyId, feed) {
  const feeds = getFeeds(babyId)
  feeds.unshift(feed)
  saveFeeds(babyId, feeds)
  return feeds
}

function deleteFeed(babyId, id) {
  const feeds = getFeeds(babyId).filter(f => f.id !== id)
  saveFeeds(babyId, feeds)
  return feeds
}

/* ---------- 备份 ---------- */
function exportAll() {
  return {
    version: 1,
    babies: getBabies(),
    currentBabyId: getCurrentId(),
    records: wx.getStorageSync(RECORDS_KEY) || {},
    vaccines: wx.getStorageSync(VACCINE_KEY) || {},
    feeds: wx.getStorageSync(FEED_KEY) || {},
    todos: wx.getStorageSync(TODO_KEY) || {},
    shareId: getShareId()
  }
}

function importAll(data) {
  if (!data || !data.babies) return false
  saveBabies(data.babies)
  setCurrentId(data.currentBabyId || (data.babies[0] && data.babies[0].id) || '')
  wx.setStorageSync(RECORDS_KEY, data.records || {})
  wx.setStorageSync(VACCINE_KEY, data.vaccines || {})
  wx.setStorageSync(FEED_KEY, data.feeds || {})
  wx.setStorageSync(TODO_KEY, data.todos || {})
  if (data.shareId) setShareId(data.shareId)
  return true
}

function getShareId() { return wx.getStorageSync(SHARE_KEY) || '' }
function setShareId(id) { wx.setStorageSync(SHARE_KEY, id) }
function clearShareId() { wx.removeStorageSync(SHARE_KEY) }

module.exports = {
  getBabies, saveBabies, getCurrentId, setCurrentId, getBabyById, getCurrentBaby,
  addBaby, updateBaby, deleteBaby,
  getRecords, saveRecords, addRecord, deleteRecord, getRecordById, updateRecord,
  getVaccines, toggleVaccine,
  getFeeds, saveFeeds, addFeed, deleteFeed,
  getTodos, saveTodos, addTodo, deleteTodo, updateTodo,
  exportAll, importAll,
  getShareId, setShareId, clearShareId
}
