import { database } from '../db/database';
import type { Investment, Loan, SavingsGoal, Trip } from '../domain/models';
const id = () => crypto.randomUUID(); const now = () => new Date().toISOString();
export const personalService = {
  async goals(): Promise<SavingsGoal[]> { return database.goals.toArray(); },
  async addGoal(input: Omit<SavingsGoal, 'id' | 'active' | 'createdAt' | 'updatedAt'>): Promise<void> { if (!input.name.trim() || input.targetMinor <= 0) throw new Error('Goal name and target are required'); const timestamp = now(); await database.goals.add({ ...input, id: id(), active: true, createdAt: timestamp, updatedAt: timestamp }); },

  async updateGoal(id: string, changes: Partial<Omit<SavingsGoal, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> { const existing = await database.goals.get(id); if (!existing) throw new Error('Goal not found'); await database.goals.put({ ...existing, ...changes, updatedAt: now() }); },
  async deleteGoal(id: string): Promise<void> { await database.goals.delete(id); },
  async loans(): Promise<Loan[]> { return database.loans.toArray(); },
  async addLoan(input: Omit<Loan, 'id' | 'active' | 'createdAt' | 'updatedAt'>): Promise<void> { if (!input.name.trim() || input.principalMinor <= 0 || input.tenureMonths <= 0) throw new Error('Loan details are invalid'); const timestamp = now(); await database.loans.add({ ...input, id: id(), active: true, createdAt: timestamp, updatedAt: timestamp }); },

  async updateLoan(id: string, changes: Partial<Omit<Loan, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> { const existing = await database.loans.get(id); if (!existing) throw new Error('Loan not found'); await database.loans.put({ ...existing, ...changes, updatedAt: now() }); },
  async deleteLoan(id: string): Promise<void> { await database.loans.delete(id); },
  async investments(): Promise<Investment[]> { return database.investments.toArray(); },
  async addInvestment(input: Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> { if (!input.name.trim() || input.currentValueMinor < 0) throw new Error('Investment details are invalid'); const timestamp = now(); await database.investments.add({ ...input, id: id(), createdAt: timestamp, updatedAt: timestamp }); },
  async updateInvestment(investmentId: string, changes: Partial<Omit<Investment, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> { const existing = await database.investments.get(investmentId); if (!existing) throw new Error('Investment not found'); await database.investments.put({ ...existing, ...changes, updatedAt: now() }); },
  async deleteInvestment(investmentId: string): Promise<void> { await database.investments.delete(investmentId); },
  async trips(): Promise<Trip[]> { return database.trips.toArray(); },

  async updateTrip(id: string, changes: Partial<Omit<Trip, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void> { const existing = await database.trips.get(id); if (!existing) throw new Error('Trip not found'); if (changes.startDate && changes.endDate && changes.startDate > changes.endDate) throw new Error('Trip dates are invalid'); await database.trips.put({ ...existing, ...changes, updatedAt: now() }); },
  async deleteTrip(id: string): Promise<void> { await database.trips.delete(id); },
  async addTrip(input: Omit<Trip, 'id' | 'active' | 'createdAt' | 'updatedAt'>): Promise<void> { if (!input.name.trim() || input.startDate > input.endDate) throw new Error('Trip details are invalid'); const timestamp = now(); await database.trips.add({ ...input, id: id(), active: true, createdAt: timestamp, updatedAt: timestamp }); }
};
