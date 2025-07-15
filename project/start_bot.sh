#!/bin/bash

# ===============================================
# 🤖 TELEGRAM AI CHATBOT - ISHGA TUSHIRISH
# ===============================================

echo "🤖 Telegram AI Chatbot - Ishga tushirish..."

# Rangarang chiqish uchun
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logo chiqarish
echo -e "${CYAN}"
echo "████████╗███████╗██╗     ███████╗ ██████╗ ██████╗  █████╗ ███╗   ███╗"
echo "╚══██╔══╝██╔════╝██║     ██╔════╝██╔════╝ ██╔══██╗██╔══██╗████╗ ████║"
echo "   ██║   █████╗  ██║     █████╗  ██║  ███╗██████╔╝███████║██╔████╔██║"
echo "   ██║   ██╔══╝  ██║     ██╔══╝  ██║   ██║██╔══██╗██╔══██║██║╚██╔╝██║"
echo "   ██║   ███████╗███████╗███████╗╚██████╔╝██║  ██║██║  ██║██║ ╚═╝ ██║"
echo "   ╚═╝   ╚══════╝╚══════╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝"
echo -e "${NC}"
echo -e "${PURPLE}                    🤖 AI CHATBOT V2.0 🤖${NC}"
echo ""

# Xususiyatlar
echo -e "${YELLOW}🌟 Xususiyatlar:${NC}"
echo -e "${GREEN}✅ 50+ AI Models (FREE/PRO)${NC}"
echo -e "${GREEN}✅ Coqui TTS (Lokal, Yuqori Sifat)${NC}"
echo -e "${GREEN}✅ Vosk STT (Offline, Multilingual)${NC}"
echo -e "${GREEN}✅ Rasm Generatsiyasi${NC}"
echo -e "${GREEN}✅ Smart Chat Sessions${NC}"
echo -e "${GREEN}✅ Referral System${NC}"
echo -e "${GREEN}✅ Admin Panel${NC}"
echo ""

# Foydalanish rejalari
echo -e "${CYAN}💎 Foydalanish Rejalari:${NC}"
echo -e "${GREEN}🆓 BEPUL:     3K/kun,  20K/oy   - \$0/oy${NC}"
echo -e "${BLUE}💎 PRO:       15K/kun, 100K/oy  - \$9.90/oy${NC}"
echo -e "${PURPLE}🌟 PREMIUM:   50K/kun, 300K/oy  - \$19.90/oy${NC}"
echo -e "${YELLOW}🏢 ENTERPRISE: 200K/kun, 1M/oy  - \$49.90/oy${NC}"
echo ""

# Systemni tekshirish
echo -e "${YELLOW}🔍 Systemni tekshirish...${NC}"

# Node.js versiyasi
NODE_VERSION=$(node --version 2>/dev/null || echo "mavjud emas")
echo -e "${GREEN}📦 Node.js: $NODE_VERSION${NC}"

# Python versiyasi
PYTHON_VERSION=$(python3 --version 2>/dev/null || echo "mavjud emas")
echo -e "${GREEN}🐍 Python: $PYTHON_VERSION${NC}"

# Dependencies tekshirish
echo -e "${YELLOW}📚 Dependencies tekshirish...${NC}"

# NPM packages
if [ -f "package.json" ]; then
    echo -e "${GREEN}✅ Node.js dependencies mavjud${NC}"
else
    echo -e "${RED}❌ package.json topilmadi${NC}"
    exit 1
fi

# Python TTS/STT packages
echo -e "${YELLOW}🔍 Python packages tekshirish...${NC}"
python3 -c "import TTS; print('✅ Coqui TTS')" 2>/dev/null || echo -e "${YELLOW}⚠️  Coqui TTS o'rnatilmagan (eSpeak fallback ishlatiladi)${NC}"
python3 -c "import vosk; print('✅ Vosk STT')" 2>/dev/null || echo -e "${YELLOW}⚠️  Vosk STT o'rnatilmagan (simple fallback ishlatiladi)${NC}"

# System binaries
which espeak >/dev/null 2>&1 && echo -e "${GREEN}✅ eSpeak mavjud${NC}" || echo -e "${RED}❌ eSpeak o'rnatilmagan${NC}"
which ffmpeg >/dev/null 2>&1 && echo -e "${GREEN}✅ FFmpeg mavjud${NC}" || echo -e "${RED}❌ FFmpeg o'rnatilmagan${NC}"
which sox >/dev/null 2>&1 && echo -e "${GREEN}✅ SoX mavjud${NC}" || echo -e "${RED}❌ SoX o'rnatilmagan${NC}"

# .env fayli tekshirish
echo -e "${YELLOW}🔧 Konfiguratsiya tekshirish...${NC}"
if [ -f ".env" ]; then
    echo -e "${GREEN}✅ .env fayli mavjud${NC}"
    
    # BOT_TOKEN tekshirish
    if grep -q "BOT_TOKEN=your_telegram_bot_token_here" .env; then
        echo -e "${RED}❌ BOT_TOKEN sozlanmagan${NC}"
        echo -e "${YELLOW}   🔧 .env faylida BOT_TOKEN ni o'zgartiring${NC}"
    else
        echo -e "${GREEN}✅ BOT_TOKEN sozlangan${NC}"
    fi
    
    # ADMIN_IDS tekshirish
    if grep -q "ADMIN_IDS=123456789,987654321" .env; then
        echo -e "${RED}❌ ADMIN_IDS sozlanmagan${NC}"
        echo -e "${YELLOW}   🔧 .env faylida ADMIN_IDS ni o'zgartiring${NC}"
    else
        echo -e "${GREEN}✅ ADMIN_IDS sozlangan${NC}"
    fi
    
    # AI API kalitlari tekshirish
    echo -e "${YELLOW}🤖 AI API kalitlari:${NC}"
    grep -q "GROQ_API_KEY=your_groq_api_key_here" .env || echo -e "${GREEN}✅ GROQ API${NC}"
    grep -q "TOGETHER_API_KEY=your_together_api_key_here" .env || echo -e "${GREEN}✅ TOGETHER API${NC}"
    grep -q "HUGGINGFACE_API_KEY=hf_your_hf_key_here" .env || echo -e "${GREEN}✅ HUGGINGFACE API${NC}"
    grep -q "OPENROUTER_API_KEY=your_openrouter_api_key_here" .env || echo -e "${GREEN}✅ OPENROUTER API${NC}"
    
else
    echo -e "${RED}❌ .env fayli topilmadi${NC}"
    exit 1
fi

# Database tekshirish
echo -e "${YELLOW}🗄️  Database tekshirish...${NC}"
if [ -f "bot.db" ]; then
    echo -e "${GREEN}✅ Database mavjud${NC}"
else
    echo -e "${YELLOW}⚠️  Database yangi yaratiladi${NC}"
fi

# TypeScript build
echo -e "${YELLOW}🔨 TypeScript build...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build muvaffaqiyatli${NC}"
else
    echo -e "${RED}❌ Build xatolik${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 Bot ishga tushirilmoqda...${NC}"
echo -e "${YELLOW}📝 Loglar: tail -f /var/log/supervisor/backend.*.log${NC}"
echo -e "${YELLOW}🔄 Restart: sudo supervisorctl restart backend${NC}"
echo -e "${YELLOW}⏹️  Stop: sudo supervisorctl stop backend${NC}"
echo ""

# Botni ishga tushirish
exec node dist/index.js