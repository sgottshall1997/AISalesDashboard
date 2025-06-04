import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short", 
    day: "numeric",
  }).format(d);
}

export function formatPercent(value: number | string): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  return `${num.toFixed(0)}%`;
}

export function calculateDaysOverdue(dueDate: Date | string): number {
  const due = typeof dueDate === "string" ? new Date(dueDate) : dueDate;
  const today = new Date();
  const diffTime = today.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
}

export function getRiskLevelColor(riskLevel: string): string {
  switch (riskLevel) {
    case "high":
      return "text-red-600 bg-red-100";
    case "medium":
      return "text-yellow-600 bg-yellow-100";
    case "low":
      return "text-green-600 bg-green-100";
    default:
      return "text-gray-600 bg-gray-100";
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "paid":
      return "text-green-800 bg-green-100";
    case "overdue":
      return "text-red-800 bg-red-100";
    case "pending":
      return "text-yellow-800 bg-yellow-100";
    default:
      return "text-gray-800 bg-gray-100";
  }
}

export function getLeadStageColor(stage: string): string {
  switch (stage) {
    case "prospect":
      return "bg-gray-100 text-gray-800";
    case "qualified":
      return "bg-blue-100 text-blue-800";
    case "proposal":
      return "bg-yellow-100 text-yellow-800";
    case "closed_won":
      return "bg-green-100 text-green-800";
    case "closed_lost":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
}
