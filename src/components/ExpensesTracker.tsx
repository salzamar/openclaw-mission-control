import React, { useState, useMemo } from 'react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
} from 'recharts';
import { IconCurrencyDollar, IconBrain, IconTrendingUp, IconX } from '@tabler/icons-react';

interface ExpensesTrackerProps {
  className?: string;
  onClose?: () => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const ExpensesTracker: React.FC<ExpensesTrackerProps> = ({ className = '', onClose }) => {
  const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month'>('week');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  
  // Calculate time range - memoized to prevent infinite re-renders
  const { startTime, endTime } = useMemo(() => {
    const now = Date.now();
    const ranges = {
      day: 24 * 60 * 60 * 1000, // 24 hours
      week: 7 * 24 * 60 * 60 * 1000, // 7 days
      month: 30 * 24 * 60 * 60 * 1000, // 30 days
    };
    return {
      startTime: now - ranges[timeRange],
      endTime: now,
    };
  }, [timeRange]);
  const usageStats = useQuery(api.usage.getUsageStats, {
    startTime,
    endTime,
  });
  
  const usageByPeriod = useQuery(api.usage.getUsageByPeriod, {
    period: timeRange === 'day' ? 'hour' : 'day',
    startTime,
    endTime,
  });
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };
  
  const formatTokens = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toString();
  };
  
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    if (timeRange === 'day') {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };
  
  if (!usageStats || !usageByPeriod) {
    return (
      <div className={`fixed inset-0 bg-white z-50 flex flex-col ${className}`}>
        <div className="flex items-center justify-between p-6 border-b">
          <h1 className="text-2xl font-bold text-gray-900">Model Usage & Expenses</h1>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close expenses tracker"
          >
            <IconX className="w-6 h-6 text-gray-500" />
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <div className="text-gray-500">Loading usage data...</div>
            <div className="text-xs text-gray-400 mt-2">Fetching from Convex database</div>
          </div>
        </div>
      </div>
    );
  }
  
  const { totalCost, totalTokens, byModel, byAgent, recentSessions } = usageStats;
  
  // Calculate budget usage (assuming $1000 monthly budget for demo)
  const monthlyBudget = 1000;
  const budgetUsed = (totalCost / monthlyBudget) * 100;
  
  return (
    <div className={`p-6 space-y-6 ${className} fixed inset-0 bg-white z-50 overflow-y-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Model Usage & Expenses</h1>
        <button
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Close expenses tracker"
        >
          <IconX className="w-6 h-6 text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as 'day' | 'week' | 'month')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="day">Last 24 Hours</option>
            <option value="week">Last 7 Days</option>
            <option value="month">Last 30 Days</option>
          </select>
          <select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as 'line' | 'bar')}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="line">Line Chart</option>
            <option value="bar">Bar Chart</option>
          </select>
        </div>
      </div>
      
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Cost</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalCost)}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-full">
              <IconCurrencyDollar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Tokens</p>
              <p className="text-2xl font-bold text-gray-900">{formatTokens(totalTokens)}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-full">
              <IconBrain className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Budget Usage</p>
              <p className="text-2xl font-bold text-gray-900">{budgetUsed.toFixed(1)}%</p>
            </div>
            <div className="p-3 bg-amber-100 rounded-full">
              <IconTrendingUp className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  budgetUsed > 90 ? 'bg-red-500' : budgetUsed > 75 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(budgetUsed, 100)}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(totalCost)} of {formatCurrency(monthlyBudget)} used
            </p>
          </div>
        </div>
      </div>
      
      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Usage Trend Chart */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            {chartType === 'line' ? (
              <LineChart data={usageByPeriod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => {
                    if (timeRange === 'day') {
                      return `${value}:00`;
                    }
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis />
                {/* @ts-ignore - recharts type mismatch */}
                <Tooltip 
                  formatter={(value: any, name: any) => [
                    name === 'cost' ? formatCurrency(value) : formatTokens(value),
                    name === 'cost' ? 'Cost' : 'Tokens'
                  ]}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="cost" 
                  stroke="#3b82f6" 
                  fill="#3b82f6" 
                  fillOpacity={0.6}
                  name="Cost"
                />
                <Line 
                  type="monotone" 
                  dataKey="tokens" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  name="Tokens"
                  yAxisId="right"
                />
              </LineChart>
            ) : (
              <BarChart data={usageByPeriod}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="period" 
                  tickFormatter={(value) => {
                    if (timeRange === 'day') {
                      return `${value}:00`;
                    }
                    const date = new Date(value);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis />
                {/* @ts-ignore - recharts type mismatch */}
                <Tooltip 
                  formatter={(value: any) => [
                    formatCurrency(value),
                    'Cost'
                  ]}
                />
                <Bar dataKey="cost" fill="#3b82f6" />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
        
        {/* Usage by Model */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Model</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={byModel}
                cx="50%"
                cy="50%"
                labelLine={false}
                // @ts-ignore - recharts type mismatch
                label={(entry: any) => `${entry.model}: ${formatCurrency(entry.cost)}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="cost"
              >
                {byModel.map((_entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              {/* @ts-ignore - recharts type mismatch */}
              <Tooltip formatter={(value: any) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Usage by Agent */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Usage by Agent</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={byAgent}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="agent" />
            <YAxis />
            {/* @ts-ignore - recharts type mismatch */}
            <Tooltip 
              formatter={(value: any, name: any) => [
                name === 'cost' ? formatCurrency(value) : formatTokens(value),
                name === 'cost' ? 'Cost' : 'Tokens'
              ]}
            />
            <Legend />
            <Bar dataKey="cost" fill="#3b82f6" name="Cost" />
            <Bar dataKey="tokens_in" fill="#10b981" name="Tokens In" />
            <Bar dataKey="tokens_out" fill="#f59e0b" name="Tokens Out" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Recent Sessions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Time
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Model
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tokens
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentSessions.map((session: any, index: number) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatDate(session.timestamp)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {session.model}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {session.agent}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatTokens(session.tokens_in + session.tokens_out)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                    {formatCurrency(session.cost)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ExpensesTracker;