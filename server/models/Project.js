const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Project name is required"],
      trim: true,
      maxlength: [200, "Project name cannot exceed 200 characters"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, "Description cannot exceed 1000 characters"],
    },
    dept_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: [true, "Department is required"],
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Creator is required"],
    },
    start_date: {
      type: Date,
      required: [true, "Start date is required"],
    },
    deadline: {
      type: Date,
      required: [true, "Deadline is required"],
      validate: {
        validator: function (value) {
          return value > this.start_date;
        },
        message: "Deadline must be after start date",
      },
    },
    status: {
      type: String,
      required: [true, "Project status is required"],
      enum: {
        values: ["Not Started", "In Progress", "Completed"],
        message: "Status must be one of: Not Started, In Progress, Completed",
      },
      default: "Not Started",
    },
    progress: {
      type: Number,
      min: [0, "Progress cannot be negative"],
      max: [100, "Progress cannot exceed 100"],
      default: 0,
    },
    manual_adjustment: {
      type: Number,
      min: [-10, "Manual adjustment cannot be less than -10%"],
      max: [10, "Manual adjustment cannot exceed +10%"],
      default: 0,
    },
    remark: {
      type: String,
      trim: true,
      maxlength: [500, "Remark cannot exceed 500 characters"],
    },
    is_read_only: {
      type: Boolean,
      default: false,
    },
    completion_details: {
      team_lead_remark: String,
      team_lead_remark_date: Date,
      md_approval: Boolean,
      md_approval_date: Date,
      md_remark: String,
    },
    // Legacy fields for backward compatibility
    startDate: Date,
    endDate: Date,
    teamId: mongoose.Schema.Types.ObjectId,
    createdBy: mongoose.Schema.Types.ObjectId,
    assignedMembers: [mongoose.Schema.Types.ObjectId],
    tasks: [mongoose.Schema.Types.ObjectId],
    priority: String,
    completionPercentage: Number,
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Indexes for performance
projectSchema.index({ name: 1 });
projectSchema.index({ status: 1 });
projectSchema.index({ dept_id: 1 });
projectSchema.index({ created_by: 1 });
projectSchema.index({ start_date: 1, deadline: 1 });

// Virtual for task count
projectSchema.virtual("taskCount").get(function () {
  return this.tasks ? this.tasks.length : 0;
});

// Virtual for assigned member count
projectSchema.virtual("memberCount").get(function () {
  return this.assignedMembers ? this.assignedMembers.length : 0;
});

// Virtual for project duration in days
projectSchema.virtual("durationDays").get(function () {
  if (this.startDate && this.endDate) {
    const diffTime = Math.abs(this.endDate - this.startDate);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for days remaining
projectSchema.virtual("daysRemaining").get(function () {
  if (this.endDate) {
    const today = new Date();
    const diffTime = this.endDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return 0;
});

// Virtual for overdue status
projectSchema.virtual("isOverdue").get(function () {
  return this.endDate < new Date() && this.status !== "completed";
});

// Instance method to add assigned member
projectSchema.methods.addMember = async function (userId) {
  if (!this.assignedMembers.includes(userId)) {
    this.assignedMembers.push(userId);
    return await this.save();
  }
  return this;
};

// Instance method to remove assigned member
projectSchema.methods.removeMember = async function (userId) {
  this.assignedMembers = this.assignedMembers.filter(
    (memberId) => !memberId.equals(userId)
  );
  return await this.save();
};

// Instance method to check if user is assigned
projectSchema.methods.isAssigned = function (userId) {
  return this.assignedMembers.some((memberId) => memberId.equals(userId));
};

// Instance method to add task
projectSchema.methods.addTask = async function (taskId) {
  if (!this.tasks.includes(taskId)) {
    this.tasks.push(taskId);
    return await this.save();
  }
  return this;
};

// Instance method to calculate completion percentage based on tasks
projectSchema.methods.calculateCompletion = async function () {
  if (this.tasks.length === 0) {
    this.completionPercentage = 0;
    return await this.save();
  }

  const Task = mongoose.model("Task");
  const tasks = await Task.find({ _id: { $in: this.tasks } });
  const completedTasks = tasks.filter((task) => task.status === "completed");

  this.completionPercentage = Math.round(
    (completedTasks.length / tasks.length) * 100
  );
  return await this.save();
};

// Static method to find projects by team
projectSchema.statics.findByTeam = function (teamId) {
  return this.find({ teamId })
    .populate("createdBy", "firstName lastName")
    .populate("assignedMembers", "firstName lastName");
};

// Static method to find projects by status
projectSchema.statics.findByStatus = function (status) {
  return this.find({ status }).populate("teamId", "name department");
};

// Static method to find overdue projects
projectSchema.statics.findOverdue = function () {
  return this.find({
    endDate: { $lt: new Date() },
    status: { $ne: "completed" },
  });
};

// Static method to create project with task sections initialization
projectSchema.statics.createProject = async function (projectData) {
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

const Project = mongoose.model("Project", projectSchema);

module.exports = Project;
