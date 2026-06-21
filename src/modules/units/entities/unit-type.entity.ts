import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';
import {
  UnitCapabilities,
  UnitCategory,
  UnitRule,
  UnitSize,
} from '../../../shared/interfaces/unit-type.interface';

@Entity('unit_type')
export class UnitType {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar' })
  type: UnitCategory;

  @Column({ type: 'varchar' })
  size: UnitSize;

  @Column()
  mobility: boolean;

  @Column({ type: 'float', nullable: true, default: null })
  speed: number | null;

  @Column({ type: 'jsonb', default: [] })
  environments: string[];

  @Column({ type: 'jsonb', default: [] })
  rules: UnitRule[];

  @Column({ type: 'jsonb', default: {} })
  capabilities: UnitCapabilities;

  @Column({ type: 'text', nullable: true, default: null })
  description: string | null;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
