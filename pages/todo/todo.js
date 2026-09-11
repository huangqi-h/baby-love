const store = require('../../utils/store.js')
const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    todos: [],
    title: '',
    note: '',
    editingId: ''
  },
  onShow() {
    cloud.autoSync().then(() => this.refresh())
  },
  refresh() {
    const babyId = store.getCurrentId()
    if (!babyId) {
      this.setData({ todos: [] })
      return
    }
    const list = store.getTodos(babyId).map(t => Object.assign({}, t, {
      doneClass: t.done ? 'todo-done' : ''
    }))
    // 未完成在前，已完成后置
    list.sort((a, b) => {
      if (a.done === b.done) return b.createdAt - a.createdAt
      return a.done ? 1 : -1
    })
    this.setData({ todos: list })
  },
  onTitleInput(e) {
    this.setData({ title: e.detail.value })
  },
  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },
  onAdd() {
    if (this._saving) return
    const babyId = store.getCurrentId()
    if (!babyId) {
      wx.showToast({ title: '请先添加宝宝', icon: 'none' })
      return
    }
    const { title, note, editingId } = this.data
    const t = title.trim()
    if (!t) {
      wx.showToast({ title: '请输入待办内容', icon: 'none' })
      return
    }
    this._saving = true
    if (editingId) {
      store.updateTodo(babyId, editingId, { title: t, note: note.trim() })
    } else {
      store.addTodo(babyId, {
        id: util.genId(),
        title: t,
        note: note.trim(),
        done: false,
        createdAt: Date.now()
      })
    }
    if (store.getShareId() && cloud.CLOUD_ENABLED) {
      cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
    }
    this._saving = false
    this.setData({ title: '', note: '', editingId: '' })
    this.refresh()
  },
  onToggle(e) {
    if (this._toggling) return
    this._toggling = true
    const id = e.currentTarget.dataset.id
    const babyId = store.getCurrentId()
    const item = store.getTodos(babyId).find(t => t.id === id)
    if (item) {
      store.updateTodo(babyId, id, { done: !item.done })
      if (store.getShareId() && cloud.CLOUD_ENABLED) {
        cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
      }
    }
    this._toggling = false
    this.refresh()
  },
  onEdit(e) {
    const id = e.currentTarget.dataset.id
    const babyId = store.getCurrentId()
    const item = store.getTodos(babyId).find(t => t.id === id)
    if (!item) return
    this.setData({
      title: item.title,
      note: item.note || '',
      editingId: id
    })
  },
  onDelete(e) {
    if (this._deleting) return
    this._deleting = true
    const id = e.currentTarget.dataset.id
    store.deleteTodo(store.getCurrentId(), id)
    if (store.getShareId() && cloud.CLOUD_ENABLED) {
      cloud.syncShare(store.getShareId(), store.exportAll()).catch(() => {})
    }
    this._deleting = false
    this.refresh()
  },
  onCancelEdit() {
    this.setData({ title: '', note: '', editingId: '' })
  }
})
