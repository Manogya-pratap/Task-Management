const mongoose = require('mongoose');

/**
 * TaskLog Model - NEW
 * Tracks daily updates for tasks
 * Used for progress tracking, audit, and charts
 */
const taskLogSchema = new mongoose.Schema({
  task_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: [true, 'Task ID is required']
  },
  updated_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Updated by user is required']
  },
  date: {
    type: Date,
    required: [true, 'Date is required'],
    default: Date.now
  },
  progress: {
    type: Number,
    required: [true, 'Progress is required'],
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100']
  },
  remark: {
    type: String,
    required: [true, 'Remark is required'],
    trim: true,
    maxlength: [500, 'Remark cannot exceed 500 characters']
  },
  hours_worked: {
    type: Number,
    min: 0,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
taskLogSchema.index({ task_id: 1, date: -1 });
taskLogSchema.index({ updated_by: 1 });
taskLogSchema.index({ date: -1 });

// Static method to get logs for a task
taskLogSchema.statics.getTaskLogs = function(taskId, limit = 30) {
  return this.find({ task_id: taskId })
    .populate('updated_by', 'name unique_id')
    .sort({ date: -1 })
    .limit(limit);
};

// Static method to get logs by date range
taskLogSchema.statics.getLogsByDateRange = function(taskId, startDate, endDate) {
  return this.find({
    task_id: taskId,
    date: { $gte: startDate, $lte: endDate }
  })
    .populate('updated_by', 'name unique_id')
    .sort({ date: -1 });
};

// Static method to get user's daily logs
taskLogSchema.statics.getUserDailyLogs = function(userId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return this.find({
    updated_by: userId,
    date: { $gte: startOfDay, $lte: endOfDay }
  })
    .populate('task_id', 'title project_id')
    .sort({ date: -1 });
};

// Instance method to check if log is from today
taskLogSchema.methods.isToday = function() {
  const today = new Date();
  const logDate = new Date(this.date);
  return today.toDateString() === logDate.toDateString();
};

const TaskLog = mongoose.model('TaskLog', taskLogSchema);

module.exports = TaskLog;
