import React from 'react';
import { AlertCircle, Calendar, IndianRupee, Wallet } from 'lucide-react';

interface FinanceAlert {
  id: string;
  title: string;
  description?: string;
  amount: number;
  dueDate: string;
  vendor?: string;
}

interface FinanceAlertsProps {
  alerts: FinanceAlert[];
}

export function FinanceAlertsWidget({ alerts }: FinanceAlertsProps) {
  if (!alerts || alerts.length === 0) {
    return null;
  }

  return (
    <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="text-rose-500 w-5 h-5" />
        <h3 className="text-sm font-extrabold text-rose-500 uppercase tracking-widest">
          Action Required: Upcoming Financial Deadlines
        </h3>
      </div>
      
      <div className="flex flex-col gap-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex justify-between items-center bg-background-primary rounded-xl p-4 border border-rose-500/10 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-rose-500" />
              </div>
              <div>
                <h4 className="text-[13px] font-bold text-text-primary">
                  Payment Due: {alert.vendor || alert.title}
                </h4>
                <div className="text-[11px] text-text-secondary flex items-center gap-1.5 mt-0.5">
                  <Calendar className="w-3 h-3" />
                  Due by {new Date(alert.dueDate).toLocaleDateString()}
                  {alert.description && <span className="opacity-50 mx-1">|</span>}
                  {alert.description && <span>{alert.description}</span>}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <span className="text-lg font-black text-rose-500">
                ${alert.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
              <button className="px-4 py-1.5 bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold rounded-lg shadow-sm transition-all">
                Pay Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
