#!/bin/bash

# Telegram AI Chatbot Complete Setup Script
# This script will install Python 3.11.9, Node.js 20.19.3, create venv, install dependencies and start the bot

set -e  # Exit on any error

echo "🤖 Telegram AI Chatbot Complete Setup Script"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   print_error "This script should not be run as root for security reasons"
   exit 1
fi

# Detect OS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    OS="linux"
    DISTRO=$(lsb_release -si 2>/dev/null || echo "Unknown")
elif [[ "$OSTYPE" == "darwin"* ]]; then
    OS="macos"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
    OS="windows"
else
    OS="unknown"
fi

print_status "Detected OS: $OS"

# Function to install system dependencies
install_system_deps() {
    print_status "Installing system dependencies..."
    
    if [[ "$OS" == "linux" ]]; then
        print_status "Installing Linux dependencies..."
        sudo apt-get update
        sudo apt-get install -y \
            build-essential \
            curl \
            wget \
            git \
            software-properties-common \
            apt-transport-https \
            ca-certificates \
            gnupg \
            lsb-release \
            python3-dev \
            python3-pip \
            python3-venv \
            libffi-dev \
            libssl-dev \
            libasound2-dev \
            portaudio19-dev \
            espeak \
            espeak-data \
            libespeak-dev \
            ffmpeg \
            sox \
            libsox-fmt-all
            
    elif [[ "$OS" == "macos" ]]; then
        print_status "Installing macOS dependencies..."
        
        # Install Xcode command line tools if not present
        if ! xcode-select -p &> /dev/null; then
            print_status "Installing Xcode command line tools..."
            xcode-select --install
        fi
        
        # Check if Homebrew is installed
        if ! command -v brew &> /dev/null; then
            print_status "Installing Homebrew..."
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        
        # Install dependencies via Homebrew
        brew install python@3.11 node@20 espeak ffmpeg sox portaudio
        
    else
        print_warning "Please install the following manually:"
        print_warning "- Build tools (gcc, make, etc.)"
        print_warning "- Python 3.11.9 development headers"
        print_warning "- Node.js 20.19.3"
        print_warning "- espeak (for TTS)"
        print_warning "- ffmpeg (for audio processing)"
        print_warning "- portaudio (for audio recording)"
    fi
}

# Function to install Python 3.11.9
install_python() {
    print_status "Installing Python 3.11.9..."
    
    if command -v python3.11 &> /dev/null; then
        PYTHON_VERSION=$(python3.11 --version)
        if [[ "$PYTHON_VERSION" == *"3.11.9"* ]]; then
            print_success "Python 3.11.9 is already installed"
            return
        else
            print_warning "Python $PYTHON_VERSION is installed, but we need 3.11.9"
        fi
    fi

    if [[ "$OS" == "linux" ]]; then
        print_status "Installing Python 3.11.9 for Linux..."
        
        # Add deadsnakes PPA for Python 3.11
        sudo add-apt-repository ppa:deadsnakes/ppa -y
        sudo apt-get update
        sudo apt-get install -y python3.11 python3.11-dev python3.11-venv python3.11-distutils
        
        # Install pip for Python 3.11
        curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11
        
    elif [[ "$OS" == "macos" ]]; then
        print_status "Installing Python 3.11.9 for macOS..."
        
        # Install Python 3.11 via Homebrew
        brew install python@3.11
        
        # Create symlinks
        brew link python@3.11 --force
        
    else
        print_error "Please install Python 3.11.9 manually from https://www.python.org/downloads/"
        exit 1
    fi
    
    # Verify installation
    if command -v python3.11 &> /dev/null; then
        PYTHON_VERSION=$(python3.11 --version)
        print_success "Python installed: $PYTHON_VERSION"
    else
        print_error "Failed to install Python 3.11.9"
        exit 1
    fi
}

# Function to install Node.js 20.19.3
install_nodejs() {
    print_status "Installing Node.js 20.19.3..."
    
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        if [[ "$NODE_VERSION" == "v20.19.3" ]]; then
            print_success "Node.js 20.19.3 is already installed"
            return
        else
            print_warning "Node.js $NODE_VERSION is installed, but we need v20.19.3"
        fi
    fi

    if [[ "$OS" == "linux" ]]; then
        print_status "Installing Node.js 20.19.3 for Linux..."
        
        # Download and install NodeSource repository
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs=20.19.3-1nodesource1
        
        # Hold the package to prevent updates
        sudo apt-mark hold nodejs
        
    elif [[ "$OS" == "macos" ]]; then
        print_status "Installing Node.js 20.19.3 for macOS..."
        
        # Install Node.js 20 via Homebrew
        brew install node@20
        brew link node@20 --force
        
    else
        print_error "Please install Node.js 20.19.3 manually from https://nodejs.org/"
        exit 1
    fi
    
    # Verify installation
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js installed: $NODE_VERSION"
    else
        print_error "Failed to install Node.js"
        exit 1
    fi
}

# Function to install Yarn
install_yarn() {
    print_status "Installing Yarn..."
    
    if command -v yarn &> /dev/null; then
        print_success "Yarn is already installed"
        return
    fi
    
    # Install Yarn globally
    npm install -g yarn
    
    if command -v yarn &> /dev/null; then
        YARN_VERSION=$(yarn --version)
        print_success "Yarn installed: v$YARN_VERSION"
    else
        print_warning "Failed to install Yarn, will use npm instead"
    fi
}

# Function to create Python virtual environment
create_venv() {
    print_status "Creating Python virtual environment..."
    
    if [[ -d "venv" ]]; then
        print_success "Virtual environment already exists"
        return
    fi
    
    # Create virtual environment with Python 3.11
    python3.11 -m venv venv
    
    print_success "Virtual environment created"
}

# Function to install Python packages
install_python_packages() {
    print_status "Installing Python packages (gTTS, Vosk)..."
    
    # Activate virtual environment
    source venv/bin/activate
    
    # Upgrade pip
    pip install --upgrade pip
    
    # Install required packages
    pip install gtts vosk requests
    
    # Download Vosk model
    print_status "Downloading Vosk model..."
    if [[ ! -d "vosk-model-small-en-us-0.15" ]]; then
        wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
        unzip vosk-model-small-en-us-0.15.zip
        rm vosk-model-small-en-us-0.15.zip
        print_success "Vosk model downloaded"
    else
        print_success "Vosk model already exists"
    fi
    
    deactivate
    print_success "Python packages installed"
}

# Function to install Node.js dependencies
install_node_deps() {
    print_status "Installing Node.js dependencies..."
    
    if [[ ! -f "package.json" ]]; then
        print_error "package.json not found. Are you in the correct directory?"
        exit 1
    fi
    
    # Install dependencies
    if command -v yarn &> /dev/null; then
        print_status "Using Yarn to install dependencies..."
        yarn install
    else
        print_status "Using npm to install dependencies..."
        npm install
    fi
    
    print_success "Node.js dependencies installed"
}

# Function to setup environment
setup_environment() {
    print_status "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if [[ ! -f ".env" ]]; then
        if [[ -f ".env.example" ]]; then
            cp .env.example .env
            print_success "Created .env file from .env.example"
            print_warning "Please edit .env file with your bot token and API keys"
        else
            print_error ".env.example file not found"
        fi
    else
        print_success ".env file already exists"
    fi
    
    # Create logs directory
    mkdir -p logs
    print_success "Created logs directory"
    
    # Create tmp directory for audio files
    mkdir -p tmp
    print_success "Created tmp directory"
}

# Function to build the project
build_project() {
    print_status "Building the project..."
    
    if command -v yarn &> /dev/null; then
        yarn build
    else
        npm run build
    fi
    
    print_success "Project built successfully"
}

# Function to start the bot
start_bot() {
    print_status "Starting the Telegram AI Chatbot..."
    
    # Check if .env file has required variables
    if [[ -f ".env" ]]; then
        if grep -q "BOT_TOKEN=your_telegram_bot_token_here" .env; then
            print_error "Please configure your BOT_TOKEN in .env file"
            print_error "Get your bot token from @BotFather on Telegram"
            exit 1
        fi
        
        if grep -q "OPENROUTER_API_KEY=your_openrouter_api_key_here" .env; then
            print_error "Please configure your OPENROUTER_API_KEY in .env file"
            print_error "Get your API key from https://openrouter.ai/"
            exit 1
        fi
    else
        print_error ".env file not found"
        exit 1
    fi
    
    print_success "🚀 Starting bot in development mode..."
    print_status "Press Ctrl+C to stop the bot"
    print_status "Python virtual environment: $(pwd)/venv"
    print_status "Vosk model: $(pwd)/vosk-model-small-en-us-0.15"
    
    # Export Python path for the bot
    export PYTHONPATH="$(pwd)/venv/lib/python3.11/site-packages:$PYTHONPATH"
    export PATH="$(pwd)/venv/bin:$PATH"
    
    if command -v yarn &> /dev/null; then
        yarn dev
    else
        npm run dev
    fi
}

# Main execution
main() {
    print_status "Starting Telegram AI Chatbot complete setup..."
    
    # Check if we're in the right directory
    if [[ ! -f "package.json" ]] || [[ ! -f "src/index.ts" ]]; then
        print_error "This doesn't appear to be the bot directory"
        print_error "Please run this script from the bot's root directory"
        exit 1
    fi
    
    # Install system dependencies
    install_system_deps
    
    # Install Python 3.11.9
    install_python
    
    # Install Node.js 20.19.3
    install_nodejs
    
    # Install Yarn
    install_yarn
    
    # Create Python virtual environment
    create_venv
    
    # Install Python packages (gTTS, Vosk)
    install_python_packages
    
    # Install Node.js dependencies
    install_node_deps
    
    # Setup environment
    setup_environment
    
    # Build project
    build_project
    
    print_success "✅ Setup completed successfully!"
    echo ""
    print_status "🔧 Configuration needed:"
    print_status "1. Edit .env file with your bot token and API keys"
    print_status "2. Get bot token from @BotFather on Telegram"
    print_status "3. Get OpenRouter API key from https://openrouter.ai/"
    echo ""
    print_status "📁 Project structure:"
    print_status "- Python venv: $(pwd)/venv"
    print_status "- Vosk model: $(pwd)/vosk-model-small-en-us-0.15"
    print_status "- Logs: $(pwd)/logs"
    print_status "- Temp files: $(pwd)/tmp"
    echo ""
    
    # Ask if user wants to start the bot
    read -p "Do you want to start the bot now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        start_bot
    else
        print_status "To start the bot later, run:"
        print_status "  ./start.sh"
        print_status "or"
        print_status "  yarn dev  (or npm run dev)"
        echo ""
        print_status "🎉 Bot is ready to use!"
    fi
}

# Run main function
main "$@"