import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Player } from '../../players/entities/player.entity';
import { Location } from '../../../shared/interfaces/player-location.interface';
import {
  UnitInstanceStatus,
  UnitPlaceLevel,
} from '../../../shared/interfaces/unit-instance.interface';
import { UnitType } from './unit-type.entity';

@Entity('unit_instances')
@Index('idx_unit_instances_owner_id', ['ownerId'])
@Index('idx_unit_instances_planet_id', ['planetId'])
@Index('idx_unit_instances_star_system_id', ['starSystemId'])
@Index('idx_unit_instances_cube_id', ['cubeId'])
export class UnitInstance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  typeId: string;

  @ManyToOne(() => UnitType, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'typeId' })
  unitType: UnitType;

  @Column()
  ownerId: string;

  @ManyToOne(() => Player)
  @JoinColumn({ name: 'ownerId' })
  owner: Player;

  @Column({ type: 'jsonb' })
  location: Location;

  @Column({ type: 'varchar' })
  placeLevel: UnitPlaceLevel;

  @Column({ type: 'uuid' })
  cubeId: string;

  @Column({ type: 'uuid', nullable: true, default: null })
  starSystemId: string | null;

  @Column({ type: 'varchar', nullable: true, default: null })
  planetId: string | null;

  @Column({ type: 'varchar', default: 'idle' })
  status: UnitInstanceStatus;

  @Column({ type: 'jsonb', default: {} })
  metadata: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
