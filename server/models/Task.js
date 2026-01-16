const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: [200, 'Task title cannot exceed 200 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  project_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project assignment is required']
  },
  assigned_to: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Task must be assigned to a user']
  },
  req_dept_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Requesting department is required']
  },
  exec_dept_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: [true, 'Executing department is required']
  },
  created_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  status: {
    type: String,
    required: [true, 'Task status is required'],
    enum: {
      values: ['Pending', 'In Progress', 'Review', 'Done'],
      message: 'Status must be one of: Pending, In Progress, Review, Done'
    },
    default: 'Pending'
  },
  kanban_stage: {
    type: String,
    required: [true, 'Kanban stage is required'],
    enum: {
      values: ['Backlog', 'Todo', 'In Progress', 'Review', 'Done'],
      message: 'Kanban stage must be one of: Backlog, Todo, In Progress, Review, Done'
    },
    default: 'Backlog'
  },
  progress: {
    type: Number,
    min: [0, 'Progress cannot be negative'],
    max: [100, 'Progress cannot exceed 100'],
    default: 0
  },
  priority: {
    type: String,
    enum: {
      values: ['Low', 'Medium', 'High', 'Urgent'],
      message: 'Priority must be one of: Low, Medium, High, Urgent'
    },
    default: 'Medium'
  },
  remark: {
    type: String,
    trim: true,
    maxlength: [500, 'Remark cannot exceed 500 characters']
  },
  due_date: {
    type: Date,
    default: null
  },
  start_date: {
    type: Date,
    default: null
  },
  completed_date: {
    type: Date,
    default: null
  },
  estimated_hours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    default: 0
  },
  // Legacy fields for backward compatibility
  projectId: mongoose.Schema.Types.ObjectId,
  assignedTo: mongoose.Schema.Types.ObjectId,
  createdBy: mongoose.Schema.Types.ObjectId,
  dueDate: Date,
  startDate: Date,
  completedDate: Date,
  estimatedHours: Number,
  actualHours: Number
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
taskSchema.index({ title: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ kanban_stage: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ assigned_to: 1 });
taskSchema.index({ project_id: 1 });
taskSchema.index({ created_by: 1 });
taskSchema.index({ req_dept_id: 1 });
taskSchema.index({ exec_dept_id: 1 });
taskSchema.index({ due_date: 1 });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.due_date && this.due_date < new Date() && this.kanban_stage !== 'Done';
});

// Virtual for days remaining
taskSchema.virtual('daysRemaining').get(function() {
  if (this.due_date) {
    const today = new Date();
    const diffTime = this.due_date - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual to check if cross-department task
taskSchema.virtual('isCrossDepartment').get(function() {
  return !this.req_dept_id.equals(this.exec_dept_id);
});

// Instance method to get status color for visual indicators
taskSchema.methods.getStatusColor = function() {
  const stageColors = {
    'Backlog': '#6c757d',      // Gray
    'Todo': '#007bff',         // Blue
    'In Progress': '#ffc107',  // Yellow/Amber
    'Review': '#fd7e14',       // Orange
    'Done': '#28a745'          // Green
  };
  return stageColors[this.kanban_stage] || '#6c757d';
};

// Instance method to move task in Kanban board
taskSchema.methods.moveToStage = async function(newStage, userId) {
  const oldStage = this.kanban_stage;
  
  // Validate stage transition
  if (oldStage === 'Review' && newStage === 'Done') {
    // Only Team Lead, MD, or ADMIN can approve
    const User = mongoose.model('User');
    const user = await User.findById(userId);
    if (!['TEAM_LEAD', 'MD', 'ADMIN'].includes(user.role)) {
      throw new Error('Only Team Lead can approve task completion');
    }
  }
  
  this.kanban_stage = newStage;
  
  // Update status based on stage
  const stageToStatus = {
    'Backlog': 'Pending',
    'Todo': 'Pending',
    'In Progress': 'In Progress',
    'Review': 'Review',
    'Done': 'Done'
  };
  this.status = stageToStatus[newStage];
  
  // Update dates
  if (newStage === 'In Progress' && !this.start_date) {
    this.start_date = new Date();
  }
  if (newStage === 'Done' && !this.completed_date) {
    this.completed_date = new Date();
    this.progress = 100;
  }
  
  // Save with validateModifiedOnly to avoid validating unchanged required fields
  await this.save({ validateModifiedOnly: true });
  return { oldStage, newStage };
};

// Instance method to update progress
taskSchema.methods.updateProgress = async function(newProgress, userId, remark) {
  this.progress = newProgress;
  
  // Create task log entry
  const TaskLog = mongoose.model('TaskLog');
  await TaskLog.create({
    task_id: this._id,
    updated_by: userId,
    progress: newProgress,
    remark: remark || 'Progress updated'
  });
  
  // Save with validateModifiedOnly to avoid validating unchanged required fields
  await this.save({ validateModifiedOnly: true });
  return this;
};

// Instance method to check if user can access task
taskSchema.methods.canUserAccess = function(user) {
  // MD and ADMIN can access all tasks
  if (user.role === 'MD' || user.role === 'ADMIN') {
    return true;
  }
  
  // Normalize role for comparison
  const userRole = (user.role || '').toUpperCase().replace('_', '_');
  
  // Team Lead can access all tasks (they manage their team)
  if (userRole === 'TEAM_LEAD' || userRole === 'TEAMLEAD') {
    return true;
  }
  
  // Task creator can access
  if (this.created_by && this.created_by.equals(user._id)) {
    return true;
  }
  
  // Assigned user can access
  if (this.assigned_to && this.assigned_to.equals(user._id)) {
    return true;
  }
  
  // Users from requesting or executing department can access
  if (user.dept_id && this.req_dept_id && user.dept_id.equals(this.req_dept_id)) {
    return true;
  }
  
  if (user.dept_id && this.exec_dept_id && user.dept_id.equals(this.exec_dept_id)) {
    return true;
  }
  
  return false;
};

// Static method to find tasks by Kanban stage
taskSchema.statics.findByKanbanStage = function(stage, filter = {}) {
  return this.find({ ...filter, kanban_stage: stage })
    .populate('assigned_to', 'name unique_id')
    .populate('created_by', 'name unique_id')
    .populate('project_id', 'name')
    .populate('req_dept_id', 'dept_name')
    .populate('exec_dept_id', 'dept_name');
};

// Static method to find tasks by status
taskSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('assignedTo', 'firstName lastName').populate('projectId', 'name');
};

// Static method to find tasks by project
taskSchema.statics.findByProject = function(projectId) {
  return this.find({ projectId }).populate('assignedTo', 'firstName lastName').populate('createdBy', 'firstName lastName');
};

// Static method to find tasks assigned to user
taskSchema.statics.findByAssignee = function(userId) {
  return this.find({ assignedTo: userId }).populate('projectId', 'name status');
};

// Static method to find overdue tasks
taskSchema.statics.findOverdue = function() {
  return this.find({
    dueDate: { $lt: new Date() },
    status: { $ne: 'completed' }
  }).populate('assignedTo', 'firstName lastName').populate('projectId', 'name');
};

// Static method to get task statistics by status
taskSchema.statics.getStatusStats = async function(filter = {}) {
  return await this.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalEstimatedHours: { $sum: '$estimatedHours' },
        totalActualHours: { $sum: '$actualHours' }
      }
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        totalEstimatedHours: 1,
        totalActualHours: 1,
        _id: 0
      }
    }
  ]);
};

// Pre-save middleware to update status color
taskSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    this.statusColor = this.getStatusColor();
  }
  next();
});

// Pre-save middleware to validate scheduled date
taskSchema.pre('save', function(next) {
  if (this.status === 'scheduled' && !this.scheduledDate) {
    return next(new Error('Scheduled date is required when status is scheduled'));
  }
  next();
});

const Task = mongoose.model('Task', taskSchema);

module.exports = Task;