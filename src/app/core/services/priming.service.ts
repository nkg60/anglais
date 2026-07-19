import { Injectable, inject } from '@angular/core';
import { db, nowIso, uid } from '../db/db';
import { Priming } from '../models';
import { StoreService } from './store.service';

@Injectable({ providedIn: 'root' })
export class PrimingService {
  private readonly store = inject(StoreService);

  bySubject(subjectId: string): Priming[] {
    return this.store
      .primings()
      .filter((p) => p.subjectId === subjectId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  latest(subjectId: string): Priming | undefined {
    return this.bySubject(subjectId)[0];
  }

  async create(
    subjectId: string,
    data: Pick<Priming, 'whatIKnow' | 'whatIWantToLearn' | 'whyItMatters'>,
  ): Promise<void> {
    const priming: Priming = { id: uid(), subjectId, ...data, createdAt: nowIso() };
    await db.primings.add(priming);
    await this.store.refreshPrimings();
  }

  async remove(id: string): Promise<void> {
    await db.primings.delete(id);
    await this.store.refreshPrimings();
  }
}
