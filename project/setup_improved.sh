#!/bin/bash

# Telegram AI Chatbot - Improved Setup Script
# Yangi xususiyatlar bilan botni sozlash

echo "🚀 Telegram AI Chatbot - Takomillashtirilgan Versiya"
echo "================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

# Check if Node.js is installed
print_step "Node.js tekshirilmoqda..."
if ! command -v node &> /dev/null; then
    print_error "Node.js o'rnatilmagan!"
    echo "Node.js 20.x+ versiyasini o'rnating: https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node --version)
print_status "Node.js versiyasi: $NODE_VERSION"

# Check if Python is installed
print_step "Python tekshirilmoqda..."
if ! command -v python3 &> /dev/null; then
    print_error "Python3 o'rnatilmagan!"
    echo "Python 3.8+ versiyasini o'rnating"
    exit 1
fi

PYTHON_VERSION=$(python3 --version)
print_status "Python versiyasi: $PYTHON_VERSION"

# Install Node.js dependencies
print_step "Node.js kutubxonalari o'rnatilmoqda..."
if [ -f "package.json" ]; then
    npm install
    print_status "Node.js kutubxonalari muvaffaqiyatli o'rnatildi"
else
    print_error "package.json fayli topilmadi!"
    exit 1
fi

# Install Python dependencies for TTS/STT
print_step "Python kutubxonalari o'rnatilmoqda..."

# Create requirements.txt if it doesn't exist
if [ ! -f "requirements.txt" ]; then
    print_status "requirements.txt yaratilmoqda..."
    cat > requirements.txt << EOF
gtts==2.5.1
vosk==0.3.45
requests==2.31.0
pydub==0.25.1
speech_recognition==3.10.0
pygame==2.5.2
numpy==1.24.3
scipy==1.11.1
librosa==0.10.1
soundfile==0.12.1
EOF
fi

# Install Python packages
pip3 install -r requirements.txt
print_status "Python kutubxonalari muvaffaqiyatli o'rnatildi"

# Install system dependencies
print_step "Tizim kutubxonalari o'rnatilmoqda..."

# Check OS and install dependencies
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    # Linux
    print_status "Linux aniqlandi"
    
    # Install espeak for TTS
    if ! command -v espeak &> /dev/null; then
        print_warning "espeak o'rnatilmoqda..."
        sudo apt-get update
        sudo apt-get install -y espeak espeak-data
        print_status "espeak muvaffaqiyatli o'rnatildi"
    else
        print_status "espeak allaqachon o'rnatilgan"
    fi
    
    # Install sox for audio processing
    if ! command -v sox &> /dev/null; then
        print_warning "sox o'rnatilmoqda..."
        sudo apt-get install -y sox libsox-fmt-all
        print_status "sox muvaffaqiyatli o'rnatildi"
    else
        print_status "sox allaqachon o'rnatilgan"
    fi
    
    # Install ffmpeg for audio conversion
    if ! command -v ffmpeg &> /dev/null; then
        print_warning "ffmpeg o'rnatilmoqda..."
        sudo apt-get install -y ffmpeg
        print_status "ffmpeg muvaffaqiyatli o'rnatildi"
    else
        print_status "ffmpeg allaqachon o'rnatilgan"
    fi
    
elif [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    print_status "macOS aniqlandi"
    
    # Install using Homebrew
    if ! command -v brew &> /dev/null; then
        print_error "Homebrew o'rnatilmagan!"
        echo "Homebrew o'rnating: /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
        exit 1
    fi
    
    # Install espeak
    if ! command -v espeak &> /dev/null; then
        print_warning "espeak o'rnatilmoqda..."
        brew install espeak
        print_status "espeak muvaffaqiyatli o'rnatildi"
    else
        print_status "espeak allaqachon o'rnatilgan"
    fi
    
    # Install sox
    if ! command -v sox &> /dev/null; then
        print_warning "sox o'rnatilmoqda..."
        brew install sox
        print_status "sox muvaffaqiyatli o'rnatildi"
    else
        print_status "sox allaqachon o'rnatilgan"
    fi
    
    # Install ffmpeg
    if ! command -v ffmpeg &> /dev/null; then
        print_warning "ffmpeg o'rnatilmoqda..."
        brew install ffmpeg
        print_status "ffmpeg muvaffaqiyatli o'rnatildi"
    else
        print_status "ffmpeg allaqachon o'rnatilgan"
    fi
fi

# Download Vosk model for STT
print_step "Vosk model yuklab olinmoqda..."
VOSK_MODEL="vosk-model-small-en-us-0.15"
if [ ! -d "$VOSK_MODEL" ]; then
    print_warning "Vosk model topilmadi. Yuklab olinmoqda..."
    wget -q --show-progress https://alphacephei.com/vosk/models/${VOSK_MODEL}.zip
    
    if [ $? -eq 0 ]; then
        unzip -q ${VOSK_MODEL}.zip
        rm ${VOSK_MODEL}.zip
        print_status "Vosk model muvaffaqiyatli yuklab olindi"
    else
        print_warning "Vosk model yuklab olinmadi (internetga ulanish kerak)"
    fi
else
    print_status "Vosk model allaqachon mavjud"
fi

# Create directories
print_step "Kerakli papkalar yaratilmoqda..."
mkdir -p tmp
mkdir -p logs
mkdir -p backups
print_status "Papkalar yaratildi"

# Check .env file
print_step ".env fayli tekshirilmoqda..."
if [ ! -f ".env" ]; then
    print_error ".env fayli topilmadi!"
    echo "Iltimos, .env faylini yarating va kerakli API kalitlarini qo'shing"
    exit 1
fi

# Check required environment variables
print_step "Environment o'zgaruvchilari tekshirilmoqda..."
source .env

required_vars=("BOT_TOKEN" "ADMIN_IDS")
missing_vars=()

for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ] || [ "${!var}" == "your_telegram_bot_token_here" ] || [ "${!var}" == "123456789,987654321" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -gt 0 ]; then
    print_error "Quyidagi environment o'zgaruvchilari to'ldirilmagan:"
    for var in "${missing_vars[@]}"; do
        echo "  - $var"
    done
    echo ""
    echo "Iltimos, .env faylini to'ldiring va qayta ishga tushiring"
    exit 1
fi

# Test basic functionality
print_step "Asosiy funksiyalar tekshirilmoqda..."

# Test espeak
if command -v espeak &> /dev/null; then
    echo "Test message" | espeak -s 150 -w /tmp/test_tts.wav 2>/dev/null
    if [ $? -eq 0 ]; then
        print_status "TTS (espeak) ishlayapti"
        rm -f /tmp/test_tts.wav
    else
        print_warning "TTS (espeak) ishlamayapti"
    fi
fi

# Test database
print_step "Database tekshirilmoqda..."
if [ -f "src/config/database.ts" ]; then
    print_status "Database konfiguratsiyasi topildi"
else
    print_error "Database konfiguratsiyasi topilmadi!"
    exit 1
fi

# Build the project
print_step "Loyiha build qilinmoqda..."
npm run build
if [ $? -eq 0 ]; then
    print_status "Build muvaffaqiyatli yakunlandi"
else
    print_error "Build xatolik bilan yakunlandi!"
    exit 1
fi

# Create start script
print_step "Ishga tushirish skripti yaratilmoqda..."
cat > start_bot.sh << 'EOF'
#!/bin/bash

# Telegram AI Chatbot - Start Script
echo "🤖 Telegram AI Chatbot ishga tushirilmoqda..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env fayli topilmadi!"
    echo "Iltimos, .env faylini yarating va API kalitlarini qo'shing"
    exit 1
fi

# Check if build directory exists
if [ ! -d "dist" ]; then
    echo "🔨 Loyiha build qilinmoqda..."
    npm run build
fi

# Start the bot
echo "🚀 Bot ishga tushmoqda..."
npm start
EOF

chmod +x start_bot.sh
print_status "Ishga tushirish skripti yaratildi: ./start_bot.sh"

# Create maintenance script
print_step "Maintenance skripti yaratilmoqda..."
cat > maintenance.sh << 'EOF'
#!/bin/bash

# Telegram AI Chatbot - Maintenance Script
echo "🔧 Telegram AI Chatbot - Maintenance"

case "$1" in
    "logs")
        echo "📋 Oxirgi loglar:"
        tail -50 logs/bot.log 2>/dev/null || echo "Log fayli topilmadi"
        ;;
    "backup")
        echo "💾 Database backup yaratilmoqda..."
        mkdir -p backups
        cp bot.db backups/bot_backup_$(date +%Y%m%d_%H%M%S).db
        echo "✅ Backup yaratildi"
        ;;
    "clean")
        echo "🧹 Temp fayllar tozalanmoqda..."
        rm -rf tmp/*
        rm -rf logs/old_*
        echo "✅ Tozalandi"
        ;;
    "update")
        echo "🔄 Kutubxonalar yangilanmoqda..."
        npm update
        pip3 install -r requirements.txt --upgrade
        echo "✅ Yangilandi"
        ;;
    "status")
        echo "📊 Bot holati:"
        if pgrep -f "node.*index.js" > /dev/null; then
            echo "✅ Bot ishlamoqda"
        else
            echo "❌ Bot ishlamayapti"
        fi
        ;;
    *)
        echo "Mavjud buyruqlar:"
        echo "  ./maintenance.sh logs     - Loglarni ko'rish"
        echo "  ./maintenance.sh backup   - Database backup"
        echo "  ./maintenance.sh clean    - Temp fayllarni tozalash"
        echo "  ./maintenance.sh update   - Kutubxonalarni yangilash"
        echo "  ./maintenance.sh status   - Bot holatini tekshirish"
        ;;
esac
EOF

chmod +x maintenance.sh
print_status "Maintenance skripti yaratildi: ./maintenance.sh"

# Final message
echo ""
echo "================================================="
echo -e "${GREEN}✅ Setup muvaffaqiyatli yakunlandi!${NC}"
echo "================================================="
echo ""
echo "🚀 Botni ishga tushirish uchun:"
echo "   ./start_bot.sh"
echo ""
echo "🔧 Maintenance uchun:"
echo "   ./maintenance.sh [logs|backup|clean|update|status]"
echo ""
echo "📋 Kerakli harakatlar:"
echo "   1. .env faylida API kalitlarini to'ldiring"
echo "   2. ADMIN_IDS ga o'z Telegram ID ingizni qo'shing"
echo "   3. Botni ishga tushiring"
echo ""
echo "📚 Yangi xususiyatlar:"
echo "   • 🔄 Bir nechta tekin API lar"
echo "   • 🎯 Tezkor TTS/STT"
echo "   • 💬 Chat sessions"
echo "   • 🧠 Smart suggestions"
echo "   • 📊 Takomillashtirilgan statistika"
echo ""
echo "🆘 Yordam kerak bo'lsa:"
echo "   @abdulahadov_abdumutolib"
echo ""
print_status "Bot tayyor! 🎉"