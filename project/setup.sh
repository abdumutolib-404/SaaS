#!/bin/bash

# ===============================================
# 🤖 TELEGRAM AI CHATBOT - SETUP V2.0
# ===============================================

echo "🤖 Telegram AI Chatbot - Setup boshlandi..."

# Rangarang chiqish uchun
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Logo
echo -e "${CYAN}"
echo "███████╗███████╗████████╗██╗   ██╗██████╗ "
echo "██╔════╝██╔════╝╚══██╔══╝██║   ██║██╔══██╗"
echo "███████╗█████╗     ██║   ██║   ██║██████╔╝"
echo "╚════██║██╔══╝     ██║   ██║   ██║██╔═══╝ "
echo "███████║███████╗   ██║   ╚██████╔╝██║     "
echo "╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝     "
echo -e "${NC}"
echo -e "${PURPLE}        🤖 AI CHATBOT SETUP V2.0 🤖${NC}"
echo ""

# Step 1: System packages
echo -e "${YELLOW}📦 Step 1: System packages o'rnatish...${NC}"
apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    python3-dev \
    build-essential \
    ffmpeg \
    sox \
    espeak \
    espeak-data \
    libsox-dev \
    libsox-fmt-all \
    portaudio19-dev \
    libportaudio2 \
    libportaudiocpp0 \
    alsa-utils \
    && echo -e "${GREEN}✅ System packages o'rnatildi${NC}" \
    || echo -e "${RED}❌ System packages xatolik${NC}"

# Step 2: Node.js dependencies
echo -e "${YELLOW}📦 Step 2: Node.js dependencies...${NC}"
npm install
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Node.js dependencies o'rnatildi${NC}"
else
    echo -e "${RED}❌ Node.js dependencies xatolik${NC}"
    exit 1
fi

# Step 3: Python dependencies
echo -e "${YELLOW}🐍 Step 3: Python dependencies...${NC}"
echo -e "${BLUE}📥 Coqui TTS o'rnatilmoqda (bu biroz vaqt oladi)...${NC}"
pip3 install --upgrade pip
pip3 install TTS vosk soundfile librosa torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Python dependencies o'rnatildi${NC}"
else
    echo -e "${YELLOW}⚠️  Python dependencies qisman o'rnatildi (eSpeak fallback ishlatiladi)${NC}"
fi

# Step 4: Vosk models download
echo -e "${YELLOW}📥 Step 4: Vosk models yuklab olinmoqda...${NC}"
mkdir -p vosk-models
cd vosk-models

# English model
echo -e "${BLUE}📥 English model yuklab olinmoqda...${NC}"
wget -q --show-progress https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
if [ $? -eq 0 ]; then
    unzip -q vosk-model-small-en-us-0.15.zip
    rm vosk-model-small-en-us-0.15.zip
    echo -e "${GREEN}✅ English model yuklab olindi${NC}"
else
    echo -e "${YELLOW}⚠️  English model yuklab olinmadi${NC}"
fi

# Russian model
echo -e "${BLUE}📥 Russian model yuklab olinmoqda...${NC}"
wget -q --show-progress https://alphacephei.com/vosk/models/vosk-model-small-ru-0.22.zip
if [ $? -eq 0 ]; then
    unzip -q vosk-model-small-ru-0.22.zip
    rm vosk-model-small-ru-0.22.zip
    echo -e "${GREEN}✅ Russian model yuklab olindi${NC}"
else
    echo -e "${YELLOW}⚠️  Russian model yuklab olinmadi${NC}"
fi

cd ..

# Step 5: TypeScript build
echo -e "${YELLOW}🔨 Step 5: TypeScript build...${NC}"
npm run build
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Build muvaffaqiyatli${NC}"
else
    echo -e "${RED}❌ Build xatolik${NC}"
    exit 1
fi

# Step 6: Permissions
echo -e "${YELLOW}🔧 Step 6: Permissions sozlash...${NC}"
chmod +x start_bot.sh
chmod +x start.sh
echo -e "${GREEN}✅ Permissions sozlandi${NC}"

echo ""
echo -e "${GREEN}🎉 SETUP TUGALLANDI!${NC}"
echo ""
echo -e "${CYAN}📋 Keyingi qadamlar:${NC}"
echo -e "${YELLOW}1. .env faylini tahrirlang:${NC}"
echo -e "   ${BLUE}nano .env${NC}"
echo ""
echo -e "${YELLOW}2. Quyidagi ma'lumotlarni to'ldiring:${NC}"
echo -e "   ${GREEN}BOT_TOKEN=${NC}your_telegram_bot_token_here"
echo -e "   ${GREEN}ADMIN_IDS=${NC}your_telegram_id"
echo -e "   ${GREEN}GROQ_API_KEY=${NC}your_groq_api_key (https://console.groq.com)"
echo ""
echo -e "${YELLOW}3. Botni ishga tushiring:${NC}"
echo -e "   ${BLUE}./start_bot.sh${NC}"
echo ""
echo -e "${PURPLE}🚀 Bot tayyor! Enjoy coding!${NC}"