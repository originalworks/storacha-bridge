import {
  Check,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import type { ClientType } from '../auth/auth.interface';

@Entity({ name: 'Spaces' })
export class Space {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
    nullable: false,
  })
  walletAddress: string;

  @Column({
    nullable: true,
  })
  did?: string;

  @Column({
    nullable: false,
  })
  proofBase64: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  @Check(`"clientType" IN ('OWEN', 'VALIDATOR')`)
  clientType: ClientType;

  @Column({ nullable: true })
  description?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
