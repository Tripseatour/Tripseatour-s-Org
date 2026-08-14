import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Sparkles, Bot, User, RefreshCw, ChevronRight, Compass, ShieldCheck, CreditCard, Clock, PhoneCall } from 'lucide-react';
import { Language } from '../types';

interface Message {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

interface TripSeaAiChatbotProps {
  currentLanguage: Language;
  onBookTourClick?: (tourId: string) => void;
  contactPhone?: string;
  lineOaId?: string;
}

export const TripSeaAiChatbot: React.FC<TripSeaAiChatbotProps> = ({
  currentLanguage,
  onBookTourClick,
  contactPhone = '+66 (0) 62 681 6494',
  lineOaId = '@056hxinu'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome-1',
      sender: 'ai',
      text: 'สวัสดีค่ะ! ยินดีต้อนรับสู่ **Trip Sea Tour Phuket** 🌊✨\n\nหนูคือ **TripSeaTour AI Assistant** ผู้ช่วยอัจฉริยะ 24 ชม. ขับเคลื่อนด้วย **Gemini AI** พร้อมแนะนำทัวร์เกาะพีพี อ่าวพังงา เรือยอชท์คาทามารัน และช่วยเหลือเรื่องการจองทุกขั้นตอนค่ะ\n\nมีอะไรให้หนูช่วยแนะนำวันนี้ไหมคะ? 👇',
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const quickQuestions = [
    { label: '🏝️ แนะนำทัวร์ยอดฮิต', query: 'ช่วยแนะนำทัวร์เกาะยอดฮิตของภูเก็ตที่คุ้มค่าที่สุดหน่อยครับ' },
    { label: '💰 เช็คราคาโปรโมชั่น', query: 'ราคาโปรโมชั่นของแต่ละทัวร์ตอนนี้มีอะไรบ้าง รวมอะไรบ้างครับ' },
    { label: '💳 ขั้นตอนการจอง & สแกนจ่าย', query: 'ขั้นตอนการจองและชำระเงินผ่าน PromptPay ทำอย่างไรบ้างครับ' },
    { label: '🛡️ ใบอนุญาต ททท. & ประกันภัย', query: 'บริษัทมีใบอนุญาต ททท. ถูกต้องไหมและมีประกันภัยอะไรบ้างครับ' },
    { label: '⏰ การรับส่งที่โรงแรม', query: 'มีบริการรถรับส่งจากโรงแรมไหนบ้าง นัดกี่โมงครับ' }
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputMessage).trim();
    if (!query || isLoading) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputMessage('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          language: currentLanguage
        })
      });

      if (res.ok) {
        const data = await res.json();
        const aiMsg: Message = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: data.reply || 'ขออภัยค่ะ ขณะนี้ระบบไม่สามารถประมวลผลคำตอบได้ โปรดลองอีกครั้งนะคะ',
          timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMsg]);
      } else {
        throw new Error('Chat API response not ok');
      }
    } catch (err) {
      console.error('Chat error:', err);
      const errorMsg: Message = {
        id: `ai-err-${Date.now()}`,
        sender: 'ai',
        text: `ขออภัยค่ะ มีข้อผิดพลาดในการเชื่อมต่อ AI ชั่วคราว 🙏\n\nท่านสามารถติดต่อสอบถามทีมงานได้โดยตรงทาง LINE: **${lineOaId}** หรือโทรสายด่วน **${contactPhone}** ได้ตลอด 24 ชม. ค่ะ`,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        sender: 'ai',
        text: 'เริ่มต้นบทสนทนาใหม่แล้วค่ะ ✨ สามารถพิมพ์สอบถามข้อมูลทัวร์ภูเก็ต ราคา และการจองได้เลยนะคะ',
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };

  // Helper to render bold markdown and newlines
  const renderMessageContent = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Process bold **text**
      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <p key={idx} className={`${line.trim() === '' ? 'h-2' : 'min-h-[1.25rem]'} leading-relaxed`}>
          {parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-bold text-teal-950">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          })}
        </p>
      );
    });
  };

  return (
    <>
      {/* Floating Widget Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-3.5 py-2 rounded-full shadow-lg border border-teal-100 text-xs font-semibold text-slate-800 animate-bounce">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span>สอบถาม AI ผู้ช่วย 24 ชม.</span>
          </div>

          <button
            id="open-ai-chatbot-btn"
            type="button"
            onClick={() => setIsOpen(true)}
            className="relative group flex items-center justify-center w-14 h-14 bg-gradient-to-tr from-teal-600 to-cyan-500 hover:from-teal-700 hover:to-cyan-600 text-white rounded-full shadow-xl hover:shadow-teal-500/30 transition-all duration-300 hover:scale-105 active:scale-95 focus:outline-none"
            title="TripSeaTour AI Chatbot (24/7 Powered by Gemini)"
          >
            <Sparkles className="absolute top-1.5 right-1.5 w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            <MessageCircle className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Main Chatbot Window */}
      {isOpen && (
        <div
          id="ai-chatbot-window"
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-[410px] h-[580px] max-h-[85vh] bg-white rounded-2xl shadow-2xl border border-slate-200/80 flex flex-col z-50 overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-cyan-700 text-white p-4 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur-sm flex items-center justify-center border border-white/20">
                  <Bot className="w-6 h-6 text-teal-100" />
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 border-2 border-teal-700 rounded-full"></span>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm text-white tracking-wide">TripSeaTour AI</h3>
                  <span className="inline-flex items-center gap-0.5 bg-amber-400/20 text-amber-200 text-[10px] px-1.5 py-0.5 rounded-full font-medium border border-amber-300/30">
                    <Sparkles className="w-2.5 h-2.5" />
                    Gemini 24/7
                  </span>
                </div>
                <p className="text-[11px] text-teal-100/90 font-light flex items-center gap-1">
                  <span>ผู้ช่วยอัจฉริยะตอบคำถามทันที</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="ล้างการสนทนา"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                id="close-ai-chatbot-btn"
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-teal-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                title="ปิดหน้าต่างแชท"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Chat Messages List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/60 text-xs sm:text-sm">
            {messages.map((msg) => {
              const isAi = msg.sender === 'ai';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isAi ? 'justify-start' : 'justify-end'}`}
                >
                  {isAi && (
                    <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs sm:text-[13px] ${
                      isAi
                        ? 'bg-white text-slate-800 border border-slate-100 rounded-tl-none'
                        : 'bg-teal-600 text-white rounded-tr-none'
                    }`}
                  >
                    {renderMessageContent(msg.text)}
                    <div
                      className={`text-[10px] mt-1 text-right ${
                        isAi ? 'text-slate-400' : 'text-teal-200'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {!isAi && (
                    <div className="w-7 h-7 rounded-lg bg-slate-700 text-white flex items-center justify-center flex-shrink-0 mt-0.5 shadow-sm">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-2.5 justify-start items-center">
                <div className="w-7 h-7 rounded-lg bg-teal-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm animate-pulse">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm text-xs text-slate-500 flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 animate-spin" />
                  <span>Gemini AI กำลังพิมพ์คำตอบ...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestions Chips */}
          <div className="bg-white border-t border-slate-100 px-3 py-2 overflow-x-auto no-scrollbar flex items-center gap-1.5">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(q.query)}
                disabled={isLoading}
                className="whitespace-nowrap text-[11px] font-medium bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 border border-slate-200/70 hover:border-teal-200 px-2.5 py-1 rounded-full transition-all duration-150 flex-shrink-0"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2"
          >
            <input
              ref={inputRef}
              id="ai-chatbot-input"
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="พิมพ์คำถามเกี่ยวกับทัวร์ภูเก็ต เช่น ราคา เกาะพีพี..."
              disabled={isLoading}
              className="flex-1 bg-slate-100/90 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white transition-all"
            />
            <button
              id="ai-chatbot-send-btn"
              type="submit"
              disabled={!inputMessage.trim() || isLoading}
              className="w-10 h-10 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-200 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center shadow-md transition-all duration-150 flex-shrink-0"
              title="ส่งคำถาม"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
