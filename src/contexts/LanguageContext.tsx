import React, { createContext, useContext, useState, ReactNode } from 'react';

type Language = 'en' | 'th';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const translations = {
  en: {
    dashboard_title: 'E-Kae Planner',
    your_trips: 'Your Trips',
    new_trip: 'New Trip',
    create_new_trip: 'Create a New Trip',
    trip_name: 'Trip Name',
    create_trip: 'Create Trip',
    no_trips: 'No trips yet',
    no_trips_desc: 'Create your first trip to start planning with friends.',
    members: 'members',
    no_description: 'No description provided.',
    loading: 'Loading...',
    loading_trip: 'Loading trip...',
    share: 'Share',
    copied: 'Link copied to clipboard!',
    timeline: 'Timeline',
    expenses: 'Expenses',
    ideas: 'Ideas',
    history: 'History',
    itinerary: 'Itinerary',
    add_event: 'Add Event',
    edit_event: 'Edit Timeline Event',
    title: 'Title',
    start_time: 'Start Time',
    location: 'Location',
    map_link: 'Google Maps Link',
    notes: 'Notes',
    save_event: 'Save Event',
    update_event: 'Update Event',
    no_events: 'No events planned yet',
    brainstorming: 'Brainstorming',
    add_idea: 'Add Idea',
    share_idea: 'Share an Idea',
    idea: 'Idea',
    link_optional: 'Link (optional)',
    why_should_we: 'Why should we do this?',
    no_ideas: 'No ideas yet. Start brainstorming!',
    votes: 'votes',
    voted: 'Voted',
    vote: 'Vote',
    view_link: 'View Link',
    expenses_title: 'Expenses',
    add_expense: 'Add Expense',
    add_new_expense: 'Add New Expense',
    what_for: 'What was this for?',
    amount: 'Amount',
    who_paid: 'Who paid?',
    me: 'Me',
    save_expense: 'Save Expense',
    no_expenses: 'No expenses recorded yet',
    paid_by: 'Paid by',
    you: 'You',
    split_each: 'Split',
    settled: 'Settled',
    owes: 'Owes',
    payer: 'Payer',
    activity_history: 'Activity History',
    no_activity: 'No activity recorded yet.',
    just_now: 'Just now',
    login_title: 'E-Kae Group Planner',
    login_desc: 'Plan your group trips easily',
    sign_in: 'Sign in with Google',
    trip_not_found: 'Trip not found',
    full_plan: 'Full Plan',
    day_view: 'Day View',
    edit_expense: 'Edit Expense',
    edit_idea: 'Edit Idea'
  },
  th: {
    dashboard_title: 'E-Kae Planner',
    your_trips: 'ทริปของคุณ',
    new_trip: 'สร้างทริปใหม่',
    create_new_trip: 'สร้างทริปใหม่',
    trip_name: 'ชื่อทริป',
    create_trip: 'สร้างทริป',
    no_trips: 'ยังไม่มีทริป',
    no_trips_desc: 'สร้างทริปแรกของคุณเพื่อเริ่มวางแผนกับเพื่อนๆ',
    members: 'คน',
    no_description: 'ไม่มีคำอธิบาย',
    loading: 'กำลังโหลด...',
    loading_trip: 'กำลังโหลดข้อมูลทริป...',
    share: 'แชร์',
    copied: 'คัดลอกลิงก์แล้ว!',
    timeline: 'แผนการเดินทาง',
    expenses: 'ค่าใช้จ่าย',
    ideas: 'ไอเดีย',
    history: 'ประวัติ',
    itinerary: 'แผนการเดินทาง',
    add_event: 'เพิ่มกิจกรรม',
    edit_event: 'แก้ไขแผนการเดินทาง',
    title: 'หัวข้อ',
    start_time: 'เวลา',
    location: 'สถานที่',
    map_link: 'ลิงก์ Google Maps',
    notes: 'บันทึกเพิ่มเติม',
    save_event: 'บันทึก',
    update_event: 'บันทึกการแก้ไข',
    no_events: 'ยังไม่มีแผนการเดินทาง',
    brainstorming: 'ระดมสมอง',
    add_idea: 'เพิ่มไอเดีย',
    share_idea: 'แชร์ไอเดีย',
    idea: 'ไอเดีย',
    link_optional: 'ลิงก์ (ไม่บังคับ)',
    why_should_we: 'ทำไมถึงควรไปที่นี่?',
    no_ideas: 'ยังไม่มีไอเดีย เริ่มแชร์กันเลย!',
    votes: 'โหวต',
    voted: 'โหวตแล้ว',
    vote: 'โหวต',
    view_link: 'ดูลิงก์',
    expenses_title: 'ค่าใช้จ่าย',
    add_expense: 'เพิ่มค่าใช้จ่าย',
    add_new_expense: 'เพิ่มค่าใช้จ่ายใหม่',
    what_for: 'รายการ',
    amount: 'จำนวนเงิน',
    who_paid: 'ใครเป็นคนจ่าย?',
    me: 'ฉัน',
    save_expense: 'บันทึก',
    no_expenses: 'ยังไม่มีรายการค่าใช้จ่าย',
    paid_by: 'จ่ายโดย',
    you: 'คุณ',
    split_each: 'หารคนละ',
    settled: 'จ่ายแล้ว',
    owes: 'ค้างจ่าย',
    payer: 'คนจ่าย',
    activity_history: 'ประวัติกิจกรรม',
    no_activity: 'ยังไม่มีประวัติกิจกรรม',
    just_now: 'เมื่อสักครู่',
    login_title: 'E-Kae Group Planner',
    login_desc: 'วางแผนทริปกลุ่มของคุณได้อย่างง่ายดาย',
    sign_in: 'เข้าสู่ระบบด้วย Google',
    trip_not_found: 'ไม่พบข้อมูลทริป',
    full_plan: 'แผนทั้งหมด',
    day_view: 'ดูรายวัน',
    edit_expense: 'แก้ไขค่าใช้จ่าย',
    edit_idea: 'แก้ไขไอเดีย'
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['en']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
