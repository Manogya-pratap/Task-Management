const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Project name is required'],
    trim: true,
    maxlength: [200, 'Project name cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Project description is required'],
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },
  status: {
    type: String,
    required: [true, 'Project status is required'],
    enum: {
      values: ['planning', 'active', 'completed', 'on_hold'],
      message: 'Status must be one of: planning, active, completed, on_hold'
    },
    default: 'planning'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be one of: low, medium, high, urgent'
    },
    default: 'medium'
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    required: [true, 'Team assignment is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  assignedMembers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  tasks: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  budget: {
    type: Number,
    min: [0, 'Budget cannot be negative'],
    default: 0
  },
  actualCost: {
    type: Number,
    min: [0, 'Actual cost cannot be negative'],
    default: 0
  },
  completionPercentage: {
    type: Number,
    min: [0, 'Completion percentage cannot be negative'],
    max: [100, 'Completion percentage cannot exceed 100'],
    default: 0
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [50, 'Tag cannot exceed 50 characters']
  }],
  attachments: [{
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }]
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
projectSchema.index({ name: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ teamId: 1 });
projectSchema.index({ createdBy: 1 });
projectSchema.index({ startDate: 1, endDate: 1 });
projectSchema.index({ 'assignedMembers': 1 });
projectSchema.index({ priority: 1 });
projectSchema.index({ tags: 1 });

// Virtual for task count
projectSchema.virtual('taskCount').get(function() {
  return this.tasks ? this.tasks.length : 0;
});

// Virtual for assigned member count
projectSchema.virtual('memberCount').get(function() {
  return this.assignedMembers ? this.assignedMembers.length : 0;
});

// Virtual for project duration in days
projectSchema.virtual('durationDays').get(function() {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for days remaining
projectSchema.virtual('daysRemaining').get(function() {
  if (this.endDate) {
    const today = new Date();
    const diffTime = this.endDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for overdue status
projectSchema.virtual('isOverdue').get(function() {
  return this.endDate < new Date() && this.status !== 'completed';
});

// Instance method to add assigned member
projectSchema.methods.addMember = async function(userId) {
  if (!this.assignedMembers.includes(userId)) {
    this.assignedMembers.push(userId);
    return await this.save();
  }
  return this;
};

// Instance method to remove assigned member
projectSchema.methods.removeMember = async function(userId) {
  this.assignedMembers = this.assignedMembers.filter(memberId => !memberId.equals(userId));
  return await this.save();
};

// Instance method to check if user is assigned
projectSchema.methods.isAssigned = function(userId) {
  return this.assignedMembers.some(memberId => memberId.equals(userId));
};

// Instance method to add task
projectSchema.methods.addTask = async function(taskId) {
  if (!this.tasks.includes(taskId)) {
    this.tasks.push(taskId);
    return await this.save();
  }
  return this;
};

// Instance method to calculate completion percentage based on tasks
projectSchema.methods.calculateCompletion = async function() {
  if (this.tasks.length === 0) {
    this.completionPercentage = 0;
    return await this.save();
  }

  const Task = mongoose.model('Task');
  const tasks = await Task.find({ _id: { $in: this.tasks } });
  const completedTasks = tasks.filter(task => task.status === 'completed');
  
  this.completionPercentage = Math.round((completedTasks.length / tasks.length) * 100);
  return await this.save();
};

// Static method to find projects by team
projectSchema.statics.findByTeam = function(teamId) {
  return this.find({ teamId }).populate('createdBy', 'firstName lastName').populate('assignedMembers', 'firstName lastName');
};

// Static method to find projects by status
projectSchema.statics.findByStatus = function(status) {
  return this.find({ status }).populate('teamId', 'name department');
};

// Static method to find overdue projects
projectSchema.statics.findOverdue = function() {
  return this.find({
    endDate: { $lt: new Date() },
    status: { $ne: 'completed' }
  });
};

// Static method to create project with task sections initialization
projectSchema.statics.createProject = async function(projectData) {
  try {
    const project = new this(projectData);
    await project.validate();
    const savedProject = await project.save();
    
    // Initialize task sections as per requirement 3.4
    // This will be handled by the Task model when tasks are created
    
    return savedProject;
  } catch (error) {
    throw error;
  }
};

const Project = mongoose.model('Project', projectSchema);

module.exports = Project;