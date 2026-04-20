import { GoogleGenAI } from '@google/genai';

/**
 * Service to handle AI generation for trip planning.
 * Uses Gemini via the @google/genai SDK.
 */
export const aiService = {
  generateItinerary: async (apiKey: string, destination: string, days: number, vibe: string, language: 'en' | 'th') => {
    // Reverting to default (v1beta) as v1 was not found
    const client = new GoogleGenAI({ apiKey });
    
    // Date context to help AI generate realistic dates
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() + 7); // Suggest starting next week

    const systemPrompt = language === 'en' 
      ? `You are a professional travel planner. Generate a ${days}-day itinerary for "${destination}" with a vibe of "${vibe}".
         Starting from ${startDate.toISOString().split('T')[0]}, generate a list of events.
         RULES:
         1. Output ONLY a raw JSON array of objects. NO markdown, NO preamble, NO text outside the array.
         2. Each object must have:
            - title: string (the name of the activity)
            - description: string (a short summary of what to do)
            - startTime: string (ISO 8601 format: YYYY-MM-DDTHH:mm:ss.sssZ)
            - location: string (the place name)
            - checklist: string[] (3-5 short reminder items for this specific event)
         3. Ensure the startTime reflects a logical daily progression (e.g., Morning, Afternoon, Evening).`
      : `คุณเป็นนักวางแผนการท่องเที่ววมืออาชีพ สร้างแผนการเดินทาง ${days} วัน สำหรับ "${destination}" ในแนว "${vibe}".
         เริ่มจากวันที่ ${startDate.toISOString().split('T')[0]}, สร้างรายการกิจกรรม
         กฎ:
         1. ส่งออกเป็นอาร์เรย์ JSON ดิบเท่านั้น ห้ามมีคำอธิบายอื่น ห้ามใส่รหัส Markdown
         2. แต่ละวัตถุต้องมีฟิลด์:
            - title: string (ชื่อกิจกรรม)
            - description: string (สรุปสั้นๆ)
            - startTime: string (รูปแบบ ISO 8601: YYYY-MM-DDTHH:mm:ss.sssZ)
            - location: string (ชื่อสถานที่)
            - checklist: string[] (รายการเตือนความจำ 3-5 รายการสำหรับกิจกรรมนี้)
         3. ตรวจสอบให้แน่ใจว่า startTime เป็นไปตามลำดับเวลาที่เหมาะสม (เช้า, บ่าย, เย็น)`;

    const userPrompt = `Generate the itinerary for ${destination} for ${days} days with ${vibe} theme in ${language === 'en' ? 'English' : 'Thai'}.`;

    try {
      const response = await client.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }]
      });

      if (!response.candidates || response.candidates.length === 0) {
        throw new Error('AI was unable to generate a response. Please check your API key or try a different destination.');
      }

      const candidate = response.candidates[0];
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('This plan was blocked by safety filters. Please try a different destination or theme.');
      }

      const text = candidate.content?.parts?.[0]?.text || '';
      
      // Clean up potential markdown formatting
      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '');
      }

      // Attempt to find JSON in the response
      const jsonMatch = cleanText.match(/\[.*\]/s);
      const finalJson = jsonMatch ? jsonMatch[0] : cleanText;

      try {
        return JSON.parse(finalJson);
      } catch (e) {
        console.error('JSON Parse Error. Raw Text:', text);
        throw new Error('Failed to parse AI response. Please try again.');
      }
    } catch (error: any) {
      console.error('AI Generation Error:', error);
      if (error.status === 403 || error.status === 401) {
        throw new Error('Invalid API Key. Please check your Gemini API key.');
      }
      if (error.status === 429) {
        throw new Error('AI quota exceeded. Please wait a moment and try again.');
      }
      throw error;
    }
  }
};
