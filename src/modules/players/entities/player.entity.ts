import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity()
export class Player {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  userId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: 0 })
  galaxyX: number;

  @Column({ default: 0 })
  galaxyY: number;

  @Column({ default: 0 })
  galaxyZ: number;

  @Column({ type: 'varchar', nullable: true })
  currentPlanetId: string | null;

  @Column({ default: 0 })
  planetX: number;

  @Column({ default: 0 })
  planetY: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
