const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  unique_id: {
    type: String,
    required: [true, 'Unique ID is required'],
    unique: true,
    trim: true,
    uppercase: true
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
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
  role: {
    type: String,
    required: [true, 'Role is required'],
    enum: {
      values: ['ADMIN', 'MD', 'TEAM_LEAD', 'EMPLOYEE', 'managing_director', 'it_admin', 'team_lead', 'employee'],
      message: 'Role must be one of: ADMIN, MD, TEAM_LEAD, EMPLOYEE, managing_director, it_admin, team_lead, employee'
    },
    default: 'EMPLOYEE'
  },
  dept_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Department',
    required: function() {
      const role = (this.role || '').toLowerCase();
      // Admin, MD, managing_director, and it_admin don't require department
      return role !== 'admin' && 
             role !== 'md' && 
             role !== 'managing_director' && 
             role !== 'it_admin';
    },
    default: null
  },
  team_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Team',
    default: null
  },
  is_active: {
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
  },
  // Legacy fields for backward compatibility (will be removed later)
  username: String,
  firstName: String,
  lastName: String,
  department: String,
  teamId: mongoose.Schema.Types.ObjectId,
  isActive: {
    type: Boolean,
    default: true
  }, // Keep for backward compatibility - synced with is_active
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
userSchema.index({ unique_id: 1 });
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ dept_id: 1 });
userSchema.index({ team_id: 1 });
userSchema.index({ is_active: 1 });

// Pre-save middleware to normalize data
userSchema.pre('save', async function(next) {
  // Set name from firstName and lastName if not provided
  if (!this.name && (this.firstName || this.lastName)) {
    this.name = `${this.firstName || ''} ${this.lastName || ''}`.trim();
  }
  
  // Set unique_id from username if not provided
  if (!this.unique_id && this.username) {
    this.unique_id = this.username.toUpperCase();
  }
  
  // Sync legacy fields
  if (this.isModified('isActive')) {
    this.is_active = this.isActive;
  }
  if (this.isModified('is_active')) {
    // Keep isActive for backward compatibility, but is_active is the source of truth
    this.isActive = this.is_active;
  }
  
  // Ensure isActive exists for backward compatibility
  if (this.isActive === undefined || this.isActive === null) {
    this.isActive = this.is_active;
  }
  
  next();
});

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
  return this.name || `${this.firstName || ''} ${this.lastName || ''}`.trim();
};

// Instance method to check if user has permission
userSchema.methods.hasPermission = function(permission) {
  // Normalize role to uppercase for comparison
  let normalizedRole = (this.role || '').toUpperCase().replace(/-/g, '_');
  
  // Map 'managing_director' and 'it_admin' to their enum equivalents
  if (normalizedRole === 'MANAGING_DIRECTOR') {
    normalizedRole = 'MD';
  } else if (normalizedRole === 'IT_ADMIN') {
    normalizedRole = 'ADMIN';
  }
  
  console.log('hasPermission check:', {
    originalRole: this.role,
    normalizedRole: normalizedRole,
    permission: permission,
    userId: this._id
  });
  
  const rolePermissions = {
    'ADMIN': ['*'], // All permissions (includes IT_ADMIN)
    'MD': ['*'], // All permissions (includes MANAGING_DIRECTOR)
    'TEAM_LEAD': [
      'view_team_data',
      'create_project',
      'create_user',
      'assign_tasks',
      'manage_team_members',
      'view_own_tasks',
      'update_task_status',
      'view_assigned_projects',
      'approve_task_completion'
    ],
    'EMPLOYEE': [
      'view_own_tasks',
      'update_task_status',
      'view_assigned_projects',
      'create_daily_update'
    ]
  };

  const userPermissions = rolePermissions[normalizedRole] || [];
  
  // Special handling for delete_user - only ADMIN and MD can delete users
  if (permission === 'delete_user') {
    const hasPermission = normalizedRole === 'ADMIN' || normalizedRole === 'MD';
    console.log('delete_user permission result:', hasPermission);
    return hasPermission;
  }
  
  const result = userPermissions.includes('*') || userPermissions.includes(permission);
  console.log('Permission result:', result);
  return result;
};

// Static method to find users by role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, is_active: true });
};

// Static method to find users by department
userSchema.statics.findByDepartment = function(deptId) {
  return this.find({ dept_id: deptId, is_active: true });
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