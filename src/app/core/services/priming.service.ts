import { Injectable, inject } from '@angular/core';
import { nowIso, uid } from '../data/dataset';
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

  create(
    subjectId: string,
    data: Pick<Priming, 'whatIKnow' | 'whatIWantToLearn' | 'whyItMatters'>,
  ): void {
    const priming: Priming = { id: uid(), subjectId, ...data, createdAt: nowIso() };
    this.store.mutate((d) => ({ ...d, primings: [...d.primings, priming] }));
  }

  remove(id: string): void {
    this.store.mutate((d) => ({ ...d, primings: d.primings.filter((p) => p.id !== id) }));
  }
}
