import { CategorySchema } from '@/lib/business/schemas';
import { CategoryRepository } from '@/lib/repositories/CategoryRepository';
import { z } from 'zod';

type CategoryInput = z.input<typeof CategorySchema>;

export class CategoryService {
  static async getAll() {
    return await CategoryRepository.getAll();
  }

  static async create(name: string, description: string = '') {
    const validated = CategorySchema.parse({ name, description });
    return await CategoryRepository.create(validated.name, validated.description);
  }

  static async update(id: string, name: string, description: string = '') {
    const validated = CategorySchema.partial().parse({ name, description });
    return await CategoryRepository.update(id, validated.name ?? '', validated.description ?? '');
  }

  static async reorder(categories: { id: string }[]) {
    return await CategoryRepository.reorder(categories);
  }

  static async updateStatus(id: string, action: string) {
    return await CategoryRepository.updateStatus(id, action);
  }

  static async delete(id: string) {
    return await CategoryRepository.delete(id);
  }
}
