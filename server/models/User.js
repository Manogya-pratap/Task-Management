const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long'],
    maxlength: [30, 'Username cannot exceed 30 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters']
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters']
  },
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['managing_director', 'it_admin', 'team_lead', 'employee'],
      message: 'Role must be one of: managing_director, it_admin, team_lead, employee'
    },
    default: 'employee'
  },
  department: {
    type: String,
    required: [true, 'Department is required'],
    trim: true,
    maxlength: [100, 'Department name cannot exceed 100 characters']
  },
  teamId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date,
    default: null
  },
  passwordChangedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.__v;
      return ret;
    }
  }
});

// Indexes for performance
userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ teamId: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash the password with cost of 12
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    
    // Update password changed timestamp
    this.passwordChangedAt = Date.now() - 1000; // Subtract 1 second to ensure JWT is created after password change
    
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error('Password comparison failed');
  }
};

// Instance method to check if password was changed after JWT was issued
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Instance method to get full name
userSchema.methods.getFullName = function() {
  return `${this.firstName} ${this.lastName}`;
};

// Instance method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
  const rolePermissions = {
    managing_director: ['*'], // All permissions
    it_admin: ['*'], // All permissions
    team_lead: [
      'view_team_data',
      'create_project',
      'create_user', // Can create employees for their team
      'assign_tasks',
      'manage_team_members',
      'view_own_tasks',
      'update_task_status',
      'view_assigned_projects'
    ],
    employee: [
      'view_own_tasks',
      'update_task_status',
      'view_assigned_projects'
    ]
  };

  const userPermissions = rolePermissions[this.role] || [];
  
  // Special handling for delete_user - only MDs can delete users
  if (permission === 'delete_user') {
    return this.role === 'managing_director';
  }
  
  return userPermissions.includes('*') || userPermissions.includes(permission);
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Static method to find users by department
userSchema.statics.findByDepartment = function(department) {
  return this.find({ department, isActive: true });
};

// Static method to create user with validation
userSchema.statics.createUser = async function(userData) {
  try {
    const user = new this(userData);
    await user.validate();
    return await user.save();
  } catch (error) {
    if (error.code === 11000) {
      // Handle duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      throw new Error(`${field} already exists`);
    }
    throw error;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;