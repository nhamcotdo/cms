#!/bin/bash

#############################################################################
# Threads Admin Panel - Installation Script
#############################################################################

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE} $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

#############################################################################
# Main Installation
#############################################################################

print_header "Threads Admin Panel - Installation"

# Check Node.js
print_info "Checking Node.js..."
if ! command_exists node; then
    print_error "Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    echo "Recommended version: 18.x or higher"
    exit 1
fi

NODE_VERSION=$(node -v)
print_success "Node.js is installed: $NODE_VERSION"

# Check npm
if ! command_exists npm; then
    print_error "npm is not installed!"
    exit 1
fi

NPM_VERSION=$(npm -v)
print_success "npm is installed: $NPM_VERSION"

# Check Python (for node-gyp)
print_info "Checking Python..."
if ! command_exists python3 && ! command_exists python; then
    print_warning "Python is not installed. Some dependencies may fail to build."
else
    PYTHON_VERSION=$(command_exists python3 && python3 --version || python --version)
    print_success "Python is installed: $PYTHON_VERSION"
fi

# Install dependencies
print_header "Installing Dependencies"
print_info "Running npm install..."
npm install

if [ $? -eq 0 ]; then
    print_success "Dependencies installed successfully"
else
    print_error "Failed to install dependencies"
    exit 1
fi

# Check if .env file exists, if not create from example
print_header "Environment Setup"

if [ -f .env ]; then
    print_warning ".env file already exists"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Keeping existing .env file"
    else
        rm .env
    fi
fi

if [ ! -f .env ]; then
    print_info "Creating .env file from .env.example..."

    if [ -f .env.example ]; then
        cp .env.example .env
        print_success ".env file created from .env.example"
    else
        # Create minimal .env file
        cat > .env << 'EOF'
# Threads API Configuration
PORT=8000
HOST=localhost

# Threads App Credentials
# Get these from: https://developers.facebook.com/apps/
THREADS_APP_ID=
THREADS_APP_SECRET=
THREADS_REDIRECT_URI=http://localhost:8000/login
THREADS_APP_SECRET=

# Graph API Version (optional, defaults to v1.0)
GRAPH_API_VERSION=v1.0

# SSL Configuration (for production)
# SSL_KEY_PATH=
# SSL_CERT_PATH=

# Database
# Database file will be created at: threads_admin.db
DB_PATH=./threads_admin.db

# Session Secret (generate a random string)
SESSION_SECRET=$(openssl rand -hex 32)

# Upload Configuration
UPLOAD_DIR=./public/uploads
MAX_FILE_SIZE=10485760

# Environment
NODE_ENV=development

# SSL Verification (set to 'false' only for development)
REJECT_UNAUTHORIZED=true
EOF
        print_success ".env file created with default values"
    fi

    print_warning "Please edit .env file with your Threads App credentials:"
    echo "  - THREADS_APP_ID"
    echo "  - THREADS_APP_SECRET"
    echo "  - THREADS_REDIRECT_URI"
    echo ""
    read -p "Press Enter to open .env file in nano editor (Ctrl+X to save)..."
    nano .env 2>/dev/null || vim .env 2>/dev/null || ${EDITOR:-vi} .env
fi

# Create necessary directories
print_header "Creating Directories"
mkdir -p public/uploads
mkdir -p logs
mkdir -p database
print_success "Directories created"

# Check PM2
print_header "PM2 Process Manager"

if ! command_exists pm2; then
    print_info "PM2 is not installed. Installing globally..."
    npm install -g pm2

    if [ $? -eq 0 ]; then
        print_success "PM2 installed successfully"
    else
        print_warning "Failed to install PM2 globally"
        print_info "You can install it later with: npm install -g pm2"
    fi
else
    PM2_VERSION=$(pm2 -v)
    print_success "PM2 is installed: $PM2_VERSION"
fi

# Final instructions
print_header "Installation Complete!"

print_success "Threads Admin Panel has been installed successfully!"
echo ""
print_info "Next steps:"
echo ""
echo "1. Make sure you have configured your .env file with Threads App credentials"
echo "   Get them from: https://developers.facebook.com/apps/"
echo ""
echo "2. Start the application:"
echo "   Development:  npm run dev"
echo "   Production:   pm2 start ecosystem.config.js"
echo ""
echo "3. Access the admin panel:"
echo "   http://localhost:8000/admin/auth/login"
echo ""
echo "4. Default admin credentials (create via UI or database):"
echo "   Username: admin"
echo "   Password: (set during first run)"
echo ""
echo "For more information, see README.md"
echo ""

# Ask if user wants to start the app now
read -p "Do you want to start the application now? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command_exists pm2; then
        print_info "Starting application with PM2..."
        pm2 start src/index.js --name threads-admin
        pm2 save
        print_success "Application started!"
        echo ""
        print_info "Useful PM2 commands:"
        echo "  pm2 logs threads-admin   - View logs"
        echo "  pm2 restart threads-admin - Restart"
        echo "  pm2 stop threads-admin    - Stop"
        echo "  pm2 delete threads-admin  - Remove"
    else
        print_info "Starting application with node..."
        node src/index.js
    fi
fi

print_success "Done!"
