import { GoogleGenAI } from "@google/genai";
import { SensorData, Thresholds } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeWardrobeEnvironment = async (
  currentData: SensorData,
  history: SensorData[],
  thresholds: Thresholds
): Promise<string> => {
  try {
    // Summarize history for the prompt to save tokens
    const recentHistory = history.slice(-20); // Last 20 readings
    const avgHum = recentHistory.reduce((acc, cur) => acc + cur.humidity, 0) / recentHistory.length;
    
    const prompt = `
      你是一个专业的智能家居卫生和衣物护理专家AI助手。
      
      当前衣柜传感器读数：
      - 温度: ${currentData.temperature.toFixed(1)}°C
      - 湿度: ${currentData.humidity.toFixed(1)}% (设定的报警阈值是 ${thresholds.maxHumidity}%)
      - 霉菌风险指数: ${currentData.moldIndex.toFixed(0)} / 100
      
      历史数据背景 (最近20次读数平均值):
      - 平均湿度: ${avgHum.toFixed(1)}%
      
      请根据以上数据，生成一份简短的衣柜健康状态报告 (150字以内)。
      请包含以下内容：
      1. 评估当前是否适合霉菌生长。
      2. 给出具体的行动建议 (例如：检查密封条、建议开启紫外线杀菌、放入除湿袋等)。
      3. 语气要贴心、专业。
      
      请使用 Markdown 格式回答，可以使用 emoji 图标增加可读性。
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        systemInstruction: "你是一个乐于助人的衣柜管家。",
        thinkingConfig: { thinkingBudget: 0 } 
      }
    });

    return response.text || "暂时无法生成分析报告。";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "连接 AI 服务失败，请检查网络设置。";
  }
};