const mongoose = require('mongoose');

const teamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters']
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  teamLead: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Team lead is required']
  },
  members: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  projects: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
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
teamSchema.index({ name: 1 });
teamSchema.index({ department: 1 });
teamSchema.index({ teamLead: 1 });
teamSchema.index({ isActive: 1 });
teamSchema.index({ 'members': 1 });

// Virtual for member count
teamSchema.virtual('memberCount').get(function() {
  return this.members ? this.members.length : 0;
});

// Virtual for project count
teamSchema.virtual('projectCount').get(function() {
  return this.projects ? this.projects.length : 0;
});

// Instance method to add member
teamSchema.methods.addMember = async function(userId) {
  if (!this.members.includes(userId)) {
    this.members.push(userId);
    return await this.save();
  }
  return this;
};

// Instance method to remove member
teamSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(memberId => !memberId.equals(userId));
  return await this.save();
};

// Instance method to check if user is member
teamSchema.methods.isMember = function(userId) {
  return this.members.some(memberId => memberId.equals(userId));
};

// Instance method to check if user is team lead
teamSchema.methods.isTeamLead = function(userId) {
  return this.teamLead.equals(userId);
};

// Static method to find teams by department
teamSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true }).populate('teamLead', 'firstName lastName email');
};

// Static method to find teams by team lead
teamSchema.statics.findByTeamLead = function(teamLeadId) {
  return this.find({ teamLead: teamLeadId, isActive: true });
};

// Static method to create team with validation
teamSchema.statics.createTeam = async function(teamData) {
  try {
    const team = new this(teamData);
    await team.validate();
    return await team.save();
  } catch (error) {
    throw error;
  }
};

// Pre-save middleware to ensure team lead is included in members
teamSchema.pre('save', function(next) {
  if (this.teamLead && !this.members.includes(this.teamLead)) {
    this.members.push(this.teamLead);
  }
  next();
});

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;