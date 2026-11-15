import type { StudyPlan } from '../../core/types/plan'
import type { StorageDriver } from '../driver'

export class PlanRepository {
  constructor(private readonly driver: StorageDriver) {}

  async listByDate(date: string): Promise<StudyPlan[]> {
    const rows = await this.driver.query('plans', (plan) => plan.date === date)
    return sortPlans(rows)
  }

  async listFromDate(date: string): Promise<StudyPlan[]> {
    const rows = await this.driver.query('plans', (plan) => plan.date >= date)
    return sortPlans(rows)
  }

  async listAll(): Promise<StudyPlan[]> {
    return sortPlans(await this.driver.all('plans'))
  }

  async save(plan: StudyPlan): Promise<StudyPlan> {
    await this.driver.put('plans', plan)
    return plan
  }

  async setDone(id: string, done: boolean, now = Date.now()): Promise<void> {
    const plan = await this.driver.get('plans', id)
    if (!plan) return
    await this.driver.put('plans', { ...plan, done, updatedAt: now })
  }

  async markNotified(id: string, at = Date.now()): Promise<void> {
    const plan = await this.driver.get('plans', id)
    if (!plan) return
    await this.driver.put('plans', { ...plan, notifiedAt: at })
  }

  async remove(id: string): Promise<void> {
    await this.driver.remove('plans', id)
  }
}

function sortPlans(plans: StudyPlan[]): StudyPlan[] {
  return plans.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const aTime = a.reminderAt ?? new Date(`${a.date}T23:59:00`).getTime()
    const bTime = b.reminderAt ?? new Date(`${b.date}T23:59:00`).getTime()
    return aTime - bTime
  })
}
