/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import { Column, CreateDateColumn, Entity, EntitySubscriberInterface, EventSubscriber, InsertEvent, JoinTable, ManyToMany, PrimaryGeneratedColumn, UpdateDateColumn, UpdateEvent } from "typeorm";
import * as bcrypt from 'bcrypt';
import * as jwt from "jsonwebtoken";

export enum UserType {
  CLIENT = "client",
  MODO = "modo",
  ADMIN = "admin",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column({ default: UserType.CLIENT })
  type: UserType;

  @Column()
  username: string;

  @Column()
  password: string;

  @Column({ default: 0 })
  totalPixels: number;

  @Column({ default: 0 })
  dailyPixels: number;

  @CreateDateColumn()
  createdAt: Date;
  @UpdateDateColumn()
  updatedAt: Date;

  checkPassword(password: string): boolean {
    return bcrypt.compareSync(password, this.password);
  }
  getJWTToken(): string {
    return jwt.sign(
      { userId: this.id, email: this.email },
      process.env.JWT_SECRET || "SECRET",
      { expiresIn: "7d" },
    )
  }
}

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User;
  }

  async hashPassword(entity: User): Promise<void> {
    entity.password = await bcrypt.hash(entity.password, 8);
  }

  async beforeInsert(event: InsertEvent<User>): Promise<void> {
    return this.hashPassword(event.entity);
  }

  async beforeUpdate({ entity, databaseEntity }: UpdateEvent<User>): Promise<void> {
    if (entity.password !== databaseEntity?.password) {
      await this.hashPassword(entity);
    }
  }
}

export interface UserReturn {
  username: string;
  totalPixels: number;
  dailyPixels: number;
}

export function formatUserReturn(user: User): UserReturn {
  return {
    username: user.username,
    totalPixels: user.totalPixels,
    dailyPixels: user.dailyPixels,
  }
}