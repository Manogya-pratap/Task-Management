#!/bin/bash
# Clear React/ESLint cache and restart

echo "Clearing React build cache..."

# Remove build folder
if [ -d "build" ]; then
    rm -rf build
    echo "✓ Removed build folder"
fi

# Remove node_modules/.cache
if [ -d "node_modules/.cache" ]; then
    rm -rf node_modules/.cache
    echo "✓ Removed node_modules/.cache"
fi

# Remove .eslintcache
if [ -f ".eslintcache" ]; then
    rm -f .eslintcache
    echo "✓ Removed .eslintcache"
fi

echo ""
echo "Cache cleared successfully!"
echo ""
echo "Now run: npm start"
