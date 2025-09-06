#!/bin/bash

# Invoice Zenith - Quick Setup Script

echo "🚀 Setting up Invoice Zenith for Public Access..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"

# Install frontend dependencies
echo "📦 Installing frontend dependencies..."
npm install

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📝 To start the application:"
echo ""
echo "Option 1 - Frontend Only (Mock Data):"
echo "  npm run dev"
echo "  Visit: http://localhost:8080"
echo ""
echo "Option 2 - Full Stack (Recommended):"
echo "  Terminal 1: cd backend && npm start"
echo "  Terminal 2: npm run dev"
echo "  Visit: http://localhost:8080"
echo ""
echo "🌐 The application is now accessible without authentication!"
echo "📊 All features are publicly available for demonstration."
echo ""
echo "📚 For more details, see SETUP_GUIDE.md"
