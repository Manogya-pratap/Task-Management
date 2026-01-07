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
  status: {
    type: String,
    required: [true, 'Task status is required'],
    enum: {
      values: ['new', 'scheduled', 'in_progress', 'completed'],
      message: 'Status must be one of: new, scheduled, in_progress, completed'
    },
    default: 'new'
  },
  priority: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'urgent'],
      message: 'Priority must be one of: low, medium, high, urgent'
    },
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: [true, 'Project assignment is required']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  scheduledDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(value) {
        // If status is scheduled, scheduledDate is required
        if (this.status === 'scheduled' && !value) {
          return false;
        }
        return true;
      },
      message: 'Scheduled date is required when status is scheduled'
    }
  },
  startDate: {
    type: Date,
    default: null
  },
  dueDate: {
    type: Date,
    default: null,
    validate: {
      validator: function(value) {
        if (value && this.startDate) {
          return value >= this.startDate;
        }
        return true;
      },
      message: 'Due date must be after start date'
    }
  },
  completedDate: {
    type: Date,
    default: null
  },
  estimatedHours: {
    type: Number,
    min: [0, 'Estimated hours cannot be negative'],
    default: 0
  },
  actualHours: {
    type: Number,
    min: [0, 'Actual hours cannot be negative'],
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
  }],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Color coding for status visualization
  statusColor: {
    type: String,
    default: function() {
      return this.getStatusColor();
    }
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
taskSchema.index({ title: 1 });
taskSchema.index({ status: 1 });
taskSchema.index({ priority: 1 });
taskSchema.index({ assignedTo: 1 });
taskSchema.index({ projectId: 1 });
taskSchema.index({ createdBy: 1 });
taskSchema.index({ scheduledDate: 1 });
taskSchema.index({ dueDate: 1 });
taskSchema.index({ tags: 1 });
taskSchema.index({ 'comments.author': 1 });

// Virtual for overdue status
taskSchema.virtual('isOverdue').get(function() {
  return this.dueDate && this.dueDate < new Date() && this.status !== 'completed';
});

// Virtual for days remaining
taskSchema.virtual('daysRemaining').get(function() {
  if (this.dueDate) {
    const today = new Date();
    const diffTime = this.dueDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Virtual for duration in days
taskSchema.virtual('durationDays').get(function() {
  if (this.startDate && this.completedDate) {
    const diffTime = Math.abs(this.completedDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
});

// Instance method to get status color for visual indicators
taskSchema.methods.getStatusColor = function() {
  const statusColors = {
    'new': '#6c757d',        // Gray - New tasks
    'scheduled': '#007bff',   // Blue - Scheduled tasks
    'in_progress': '#ffc107', // Yellow/Amber - In progress tasks
    'completed': '#28a745'    // Green - Completed tasks
  };
  return statusColors[this.status] || '#6c757d';
};

// Instance method to update status with automatic date handling
taskSchema.methods.updateStatus = async function(newStatus) {
  const oldStatus = this.status;
  this.status = newStatus;
  
  // Handle automatic date updates based on status changes
  switch (newStatus) {
    case 'scheduled':
      if (!this.scheduledDate) {
        this.scheduledDate = new Date();
      }
      break;
    case 'in_progress':
      if (!this.startDate) {
        this.startDate = new Date();
      }
      break;
    case 'completed':
      if (!this.completedDate) {
        this.completedDate = new Date();
      }
      break;
  }
  
  // Update status color
  this.statusColor = this.getStatusColor();
  
  return await this.save();
};

// Instance method to add comment
taskSchema.methods.addComment = async function(authorId, content) {
  this.comments.push({
    author: authorId,
    content: content
  });
  return await this.save();
};

// Instance method to check if user can access task
taskSchema.methods.canUserAccess = function(user) {
  // MD and IT_Admin can access all tasks
  if (user.role === 'managing_director' || user.role === 'it_admin') {
    return true;
  }
  
  // Task creator can access
  if (this.createdBy.equals(user._id)) {
    return true;
  }
  
  // Assigned user can access
  if (this.assignedTo && this.assignedTo.equals(user._id)) {
    return true;
  }
  
  // Team leads can access tasks in their team's projects
  if (user.role === 'team_lead' && user.teamId) {
    // This would need to be populated with project and team data
    return true; // Simplified for now
  }
  
  return false;
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