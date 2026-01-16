const mongoose = require('mongoose');

/**
 * Department Model - NEW
 * Represents the 6 fixed departments in the organization
 * Each department can have one active project
 */
const departmentSchema = new mongoose.Schema({
  dept_name: {
    type: String,
    required: [true, 'Department name is required'],
    unique: true,
    trim: true
  },
  // Legacy field for backward compatibility
  name: {
    type: String,
    trim: true
  },
  active_project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  is_active: {
    type: Boolean,
    default: true
  },
  // Legacy field
  isActive: {
    type: Boolean,
    default: true
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

// Pre-save middleware to sync fields
departmentSchema.pre('save', function(next) {
  // Sync name and dept_name
  if (!this.name && this.dept_name) {
    this.name = this.dept_name;
  }
  if (!this.dept_name && this.name) {
    this.dept_name = this.name;
  }
  
  // Sync isActive and is_active
  if (this.isModified('isActive')) {
    this.is_active = this.isActive;
  }
  if (this.isModified('is_active')) {
    this.isActive = this.is_active;
  }
  
  next();
});

// Indexes
departmentSchema.index({ dept_name: 1 });
departmentSchema.index({ is_active: 1 });

// Static method to get all active departments
departmentSchema.statics.getActiveDepartments = function() {
  return this.find({ is_active: true }).sort({ dept_name: 1 });
};

// Static method to find by name
departmentSchema.statics.findByName = function(name) {
  return this.findOne({ dept_name: name, is_active: true });
};

const Department = mongoose.model('Department', departmentSchema);

module.exports = Department;
