// Test file to verify import paths
console.log("Testing imports...");

try {
  const responsiveCSS = require("./styles/responsive.css");
  console.log("✅ responsive.css imported successfully");
} catch (error) {
  console.error("❌ Failed to import responsive.css:", error.message);
}

try {
  const ProfileModal = require("./components/ProfileModal");
  console.log("✅ ProfileModal imported successfully");
} catch (error) {
  console.error("❌ Failed to import ProfileModal:", error.message);
}

try {
  const exportUtils = require("./utils/exportUtils");
  console.log("✅ exportUtils imported successfully");
} catch (error) {
  console.error("❌ Failed to import exportUtils:", error.message);
}
