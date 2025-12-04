export interface SensorData {
  timestamp: number;
  temperature: number; // Celsius
  humidity: number; // Percentage
  moldIndex: number; // 0-100 scale (simulated spore concentration)
}

export interface DeviceState {
  fan: boolean; // Ventilation
  dehumidifier: boolean; // Drying
  uvLight: boolean; // Sterilization
  autoMode: boolean; // System handles logic automatically
}

export interface Thresholds {
  maxHumidity: number;
  triggerUVPeriod: number; // Hours
}

export enum AppTab {
  DASHBOARD = 'DASHBOARD',
  HISTORY = 'HISTORY',
  SETTINGS = 'SETTINGS',
  AI_INSIGHTS = 'AI_INSIGHTS',
  HARDWARE_GUIDE = 'HARDWARE_GUIDE'
}