
export enum Branch {
  DELEGATE_1 = 'ابو اديب (مندوب)',
  DELEGATE_2 = 'معتز (مندوب)',
  DELEGATE_3 = 'عصام (مندوب)',
  OFFICE = 'المكتب الرئيسي'
}

export enum UserRole {
  DELEGATE = 'DELEGATE',
  ACCOUNTANT = 'ACCOUNTANT',
  ADMIN = 'ADMIN'
}

export enum TransactionType {
  FEEDING = 'تغذية',
  EXPENSE = 'مصروف',
  CUSTODY_RECEIPT = 'استلام عهدة'
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  password?: string;
  branch?: Branch;
}

export interface AppConfig {
  sheetUrl: string;
  telegramToken: string;
  telegramChatId: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  branch: Branch | string;
  date: string;
  createdBy: string;
  verified: boolean;
  timestamp: number;
  attachment?: string;
}
