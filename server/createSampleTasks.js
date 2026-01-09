const mongoose = require("mongoose");
const Task = require("./models/Task");
const Project = require("./models/Project");
const User = require("./models/User");
const Team = require("./models/Team");
require("dotenv").config();

const createSampleTasks = async () => {
  try {
    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI ||
        "mongodb+srv://mpsingh1932000_db_user:SjdO4YMSoN3s0Nr2@task-management.4t1yxy0.mongodb.net/?appName=task-management"
    );
    console.log("Connected to database");

    // Find the employee user
    const employee = await User.findOne({ username: "employee" });
    if (!employee) {
      console.log("Employee user not found");
      return;
    }
    console.log("Found employee user:", employee._id);

    // Find or create a project for the employee
    let project = await Project.findOne({ assignedMembers: employee._id });
    if (!project) {
      // Find a team or create a dummy one
      let team = await Team.findOne({ name: "Default Team" });
      if (!team) {
        team = new Team({
          name: "Default Team",
          department: "General",
          teamLead: employee._id,
          members: [employee._id],
        });
        await team.save();
        console.log("Created team:", team._id);
      }

      project = new Project({
        name: "Employee Personal Project",
        description: "Personal project for employee tasks",
        status: "active",
        teamId: team._id,
        createdBy: employee._id,
        assignedMembers: [employee._id],
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      });
      await project.save();
      console.log("Created project:", project._id);
    } else {
      console.log("Found existing project:", project._id);
    }

    // Create sample tasks for the employee
    const sampleTasks = [
      {
        title: "Complete Daily Report",
        description: "Submit daily activity report",
        status: "new",
        priority: "medium",
        assignedTo: employee._id,
        projectId: project._id,
        createdBy: employee._id,
        scheduledDate: new Date(),
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      },
      {
        title: "Review Project Documentation",
        description: "Review and update project documentation",
        status: "in_progress",
        priority: "high",
        assignedTo: employee._id,
        projectId: project._id,
        createdBy: employee._id,
        scheduledDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // Day after tomorrow
      },
      {
        title: "Team Meeting Preparation",
        description: "Prepare agenda for team meeting",
        status: "scheduled",
        priority: "medium",
        assignedTo: employee._id,
        projectId: project._id,
        createdBy: employee._id,
        scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // In 3 days
      },
      {
        title: "Code Review",
        description: "Review pull requests from team members",
        status: "completed",
        priority: "low",
        assignedTo: employee._id,
        projectId: project._id,
        createdBy: employee._id,
        scheduledDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
      },
      {
        title: "Update Task Status",
        description: "Update status of all assigned tasks",
        status: "new",
        priority: "urgent",
        assignedTo: employee._id,
        projectId: project._id,
        createdBy: employee._id,
        scheduledDate: new Date(),
        dueDate: new Date(Date.now() + 12 * 60 * 60 * 1000), // In 12 hours
      },
    ];

    // Delete existing tasks for this employee to avoid duplicates
    await Task.deleteMany({ assignedTo: employee._id });
    console.log("Deleted existing tasks for employee");

    // Create new sample tasks
    const createdTasks = await Task.insertMany(sampleTasks);
    console.log(`Created ${createdTasks.length} sample tasks for employee`);

    // Verify the tasks were created
    const taskCount = await Task.countDocuments({ assignedTo: employee._id });
    console.log(`Total tasks for employee: ${taskCount}`);

    console.log("Sample tasks created successfully!");
  } catch (error) {
    console.error("Error creating sample tasks:", error);
  } finally {
    await mongoose.disconnect();
  }
};

createSampleTasks();
